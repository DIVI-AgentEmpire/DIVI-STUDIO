"""Query OpenStreetMap (free, no key) for businesses via the public Overpass API.

Data (c) OpenStreetMap contributors, ODbL. Keep that attribution in anything you share.
"""

import sys
import time

import requests

from .categories import classify
from .net import USER_AGENT

ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.private.coffee/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


def build_query(category, spatial, limit):
    parts = "".join(f'nwr["{k}"="{v}"]["name"]{spatial};' for k, v in category.tags)
    return f"[out:json][timeout:120];({parts});out tags center {int(limit)};"


def run_query(query, fetcher=None):
    key = "overpass:" + query
    if fetcher:
        cached = fetcher.cache_get(key)
        if cached is not None:
            return cached
    last_err = None
    for attempt in range(2):
        for url in ENDPOINTS:
            try:
                r = requests.post(url, data={"data": query}, timeout=180,
                                  headers={"User-Agent": USER_AGENT})
                if r.status_code == 200:
                    data = r.json()
                    if fetcher:
                        fetcher.cache_put(key, data)
                    return data
                last_err = f"{url} -> HTTP {r.status_code}"
            except (requests.RequestException, ValueError) as exc:
                last_err = f"{url} -> {exc}"
        time.sleep(10 * (attempt + 1))  # public servers rate-limit; back off
    raise RuntimeError(f"Overpass query failed: {last_err}")


def element_to_business(el, cat=None):
    tags = el.get("tags", {})
    cat = cat or classify(tags)
    if not cat or not tags.get("name"):
        return None
    lat = el.get("lat") or (el.get("center") or {}).get("lat")
    lon = el.get("lon") or (el.get("center") or {}).get("lon")
    get = lambda *keys: next((tags[k] for k in keys if tags.get(k)), "")
    addr = ", ".join(x for x in (
        get("addr:housenumber"), get("addr:street"), get("addr:suburb", "addr:neighbourhood"),
        get("addr:city"), get("addr:postcode")) if x)
    return {
        "name": tags["name"].strip(),
        "category": cat.key,
        "phone": get("contact:phone", "phone", "contact:mobile", "mobile"),
        "email": get("contact:email", "email"),
        "website": get("contact:website", "website", "url"),
        "whatsapp": get("contact:whatsapp", "whatsapp"),
        "facebook": get("contact:facebook", "facebook"),
        "instagram": get("contact:instagram", "instagram"),
        "address": addr,
        "locality": get("addr:suburb", "addr:neighbourhood", "addr:district"),
        "opening_hours": tags.get("opening_hours", ""),
        "brand": get("brand", "brand:wikidata", "operator:wikidata"),
        "lat": lat,
        "lon": lon,
        "source": f"https://www.openstreetmap.org/{el.get('type', 'node')}/{el.get('id', '')}",
    }


def fetch_businesses(categories, spatial, limit, fetcher=None, log=sys.stderr):
    out = []
    for i, cat in enumerate(categories):
        print(f"[osm] {cat.label} ...", file=log, end=" ", flush=True)
        data = run_query(build_query(cat, spatial, limit), fetcher)
        found = [b for b in (element_to_business(el, cat) for el in data.get("elements", [])) if b]
        print(len(found), file=log)
        out.extend(found)
        if i < len(categories) - 1:
            time.sleep(2)  # be gentle with the shared public server
    return out
