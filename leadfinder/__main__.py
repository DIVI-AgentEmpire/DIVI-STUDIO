"""Command line entry point: python -m leadfinder --help"""

import argparse
import json
import sys
from pathlib import Path

from . import areas, overpass, pipeline, report
from .categories import BY_KEY, CATEGORIES, DEFAULT_KEYS
from .net import Fetcher


def main(argv=None):
    p = argparse.ArgumentParser(
        prog="leadfinder",
        description="Find and rank Bengaluru small/mid businesses that could use AI chatbots or "
                    "automation. Free sources only; never sends messages.")
    p.add_argument("--area", default="bengaluru",
                   help="'bengaluru' (whole city), a locality name, or 'lat,lon'. See --list-areas.")
    p.add_argument("--radius", type=int, default=3000, help="metres around a locality (default 3000)")
    p.add_argument("--categories", default=",".join(DEFAULT_KEYS),
                   help="comma-separated category keys. See --list-categories.")
    p.add_argument("--limit", type=int, default=150, help="max businesses per category from OSM")
    p.add_argument("--import-csv", action="append", default=[], metavar="FILE",
                   help="add businesses you collected yourself (columns: name,category,phone,email,"
                        "website,address,locality). Can repeat.")
    p.add_argument("--no-osm", action="store_true", help="skip OpenStreetMap; only use --import-csv")
    p.add_argument("--from-json", metavar="FILE", help="use a saved Overpass JSON response instead of querying")
    p.add_argument("--no-audit", action="store_true", help="don't visit business websites")
    p.add_argument("--require-contact", action="store_true",
                   help="drop leads with no phone, email or WhatsApp")
    p.add_argument("--min-score", type=int, default=0)
    p.add_argument("--out", default="output", help="output folder (default ./output)")
    p.add_argument("--workers", type=int, default=4)
    p.add_argument("--list-areas", action="store_true")
    p.add_argument("--list-categories", action="store_true")
    a = p.parse_args(argv)

    if a.list_areas:
        print("bengaluru (whole city)\n" + "\n".join(sorted(areas.LOCALITIES)))
        return 0
    if a.list_categories:
        for c in CATEGORIES:
            print(f"{c.key:13} fit={c.fit:2}  {c.label}{'' if c.key in DEFAULT_KEYS else '  (opt-in)'}")
        return 0

    cats = []
    for k in (x.strip() for x in a.categories.split(",") if x.strip()):
        if k not in BY_KEY:
            p.error(f"unknown category '{k}'. Use --list-categories.")
        cats.append(BY_KEY[k])

    fetcher = Fetcher()
    leads = []
    if a.from_json:
        data = json.loads(Path(a.from_json).read_text())
        leads += [b for b in map(overpass.element_to_business, data.get("elements", [])) if b
                  and b["category"] in {c.key for c in cats}]
    elif not a.no_osm:
        spatial = areas.resolve(a.area, a.radius)
        try:
            leads += overpass.fetch_businesses(cats, spatial, a.limit, fetcher)
        except RuntimeError as exc:
            print(f"[osm] {exc}\n[osm] Public Overpass servers are busy; wait a minute and retry "
                  f"(results already fetched are cached).", file=sys.stderr)
            if not a.import_csv:
                return 1
        if a.area.lower() in areas.LOCALITIES:
            for lead in leads:
                lead["locality"] = lead["locality"] or a.area.replace("-", " ").title()
    for path in a.import_csv:
        leads += pipeline.load_csv(path)

    leads = pipeline.dedupe(leads)
    print(f"[leads] {len(leads)} unique businesses", file=sys.stderr)
    if not leads:
        print("No businesses found. Try a larger --radius, other --categories, or --area bengaluru.",
              file=sys.stderr)
        return 1

    if not a.no_audit:
        pipeline.enrich(leads, fetcher, workers=a.workers)
    leads = pipeline.rank(leads)
    if a.require_contact:
        leads = [l for l in leads if l.get("phone") or l.get("email") or report.whatsapp_link(l)]
    leads = [l for l in leads if l["score"] >= a.min_score]
    for i, lead in enumerate(leads, 1):
        lead["rank"] = i

    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    csv_path, html_path = out / "leads.csv", out / "leads.html"
    report.write_csv(leads, csv_path)
    report.write_html(leads, html_path)

    print(f"\nTop leads:", file=sys.stderr)
    for lead in leads[:10]:
        contact = lead.get("phone") or lead.get("email") or "-"
        print(f"  {lead['rank']:>3}. [{lead['tier']} {lead['score']:>3}] {lead['name'][:40]:40} {contact}",
              file=sys.stderr)
    print(f"\nWrote {len(leads)} leads to {csv_path} and {html_path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
