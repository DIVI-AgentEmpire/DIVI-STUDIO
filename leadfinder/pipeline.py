"""Merge, dedupe, audit and rank."""

import csv
import re
import sys
from concurrent.futures import ThreadPoolExecutor

from .audit import DIRECTORY_DOMAINS, SOCIAL_DOMAINS, audit_site, is_blocked, normalize_phone
from .categories import BY_KEY
from .scoring import score

CSV_IMPORT_FIELDS = ("name", "category", "phone", "email", "website", "address", "locality")


def _key(lead):
    name = re.sub(r"[^a-z0-9]", "", lead["name"].lower())
    phone = re.sub(r"\D", "", lead.get("phone", ""))[-10:]
    return (name, phone) if phone else (name, (lead.get("locality") or lead.get("address", ""))[:20].lower())


def dedupe(leads):
    seen, out = {}, []
    for lead in leads:
        k = _key(lead)
        if k in seen:
            prev = seen[k]
            for f, v in lead.items():
                if v and not prev.get(f):
                    prev[f] = v
            continue
        seen[k] = lead
        out.append(lead)
    return out


def load_csv(path):
    """Load businesses you collected yourself (e.g. noted by hand from a map or walk-in)."""
    leads = []
    with open(path, newline="", encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            row = {k.strip().lower(): (v or "").strip() for k, v in row.items() if k}
            if not row.get("name"):
                continue
            cat = row.get("category", "").lower()
            if cat not in BY_KEY:
                print(f"[csv] '{row['name']}': unknown category '{cat}', using 'professional'. "
                      f"Valid: {', '.join(BY_KEY)}", file=sys.stderr)
                cat = "professional"
            lead = {k: row.get(k, "") for k in CSV_IMPORT_FIELDS}
            lead.update(category=cat, source=f"csv:{path}", brand=row.get("brand", ""),
                        opening_hours=row.get("opening_hours", ""), whatsapp=row.get("whatsapp", ""))
            leads.append(lead)
    return leads


def enrich(leads, fetcher, workers=4, log=sys.stderr):
    """Audit each lead's website and fill in missing email/phone from it."""
    todo = [l for l in leads if l.get("website")]
    print(f"[web] auditing {len(todo)} websites (robots.txt respected)...", file=log)

    def work(lead):
        lead["audit"] = audit_site(lead["website"], fetcher)
        return lead

    with ThreadPoolExecutor(max_workers=workers) as pool:
        for i, _ in enumerate(pool.map(work, todo), 1):
            if i % 10 == 0 or i == len(todo):
                print(f"[web] {i}/{len(todo)}", file=log)
    for lead in leads:
        lead.setdefault("audit", {"site_status": "none"} if not lead.get("website") else {})
        a = lead["audit"]
        if not lead.get("email") and a.get("emails"):
            lead["email"] = a["emails"][0]
        if not lead.get("phone") and a.get("phones"):
            lead["phone"] = a["phones"][0]
    return leads


def _offline_status(url):
    if not url:
        return "none"
    if is_blocked(url, SOCIAL_DOMAINS):
        return "social_only"
    if is_blocked(url, DIRECTORY_DOMAINS):
        return "directory_only"
    return "unchecked"


def rank(leads):
    for lead in leads:
        lead["phone"] = normalize_phone(lead.get("phone", "").split(";")[0])
        lead.setdefault("audit", {"site_status": _offline_status(lead.get("website", ""))})
        score(lead)
    leads.sort(key=lambda l: (-l["score"], l["name"].lower()))
    for i, lead in enumerate(leads, 1):
        lead["rank"] = i
    return leads
