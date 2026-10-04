"""Search areas in Bengaluru. Coordinates are approximate locality centres."""

# south, west, north, east covering BBMP limits with some margin
BENGALURU_BBOX = (12.83, 77.45, 13.15, 77.80)

LOCALITIES = {
    "koramangala": (12.9352, 77.6245),
    "indiranagar": (12.9784, 77.6408),
    "hsr-layout": (12.9116, 77.6474),
    "whitefield": (12.9698, 77.7500),
    "jayanagar": (12.9250, 77.5938),
    "jp-nagar": (12.9063, 77.5857),
    "btm-layout": (12.9166, 77.6101),
    "malleshwaram": (13.0035, 77.5710),
    "electronic-city": (12.8452, 77.6602),
    "marathahalli": (12.9569, 77.7011),
    "hebbal": (13.0358, 77.5970),
    "rajajinagar": (12.9915, 77.5545),
    "banashankari": (12.9255, 77.5468),
    "yelahanka": (13.1007, 77.5963),
    "mg-road": (12.9757, 77.6055),
    "bellandur": (12.9304, 77.6784),
    "sarjapur-road": (12.9100, 77.6870),
    "basavanagudi": (12.9406, 77.5738),
    "rt-nagar": (13.0213, 77.5946),
    "kr-puram": (13.0076, 77.6950),
}


def resolve(area: str, radius_m: int):
    """Turn an area name or 'lat,lon' into an Overpass spatial filter string."""
    area = area.strip().lower()
    if area in ("bengaluru", "bangalore", "all", ""):
        s, w, n, e = BENGALURU_BBOX
        return f"({s},{w},{n},{e})"
    if area in LOCALITIES:
        lat, lon = LOCALITIES[area]
    else:
        try:
            lat, lon = (float(x) for x in area.split(","))
        except ValueError:
            known = ", ".join(sorted(LOCALITIES))
            raise SystemExit(f"Unknown area '{area}'. Use 'bengaluru', 'lat,lon', or one of: {known}")
    return f"(around:{int(radius_m)},{lat},{lon})"
