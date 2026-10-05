"""Rank leads by how likely they are to need and buy a chatbot / automation, and how reachable they are."""

from .categories import BY_KEY


def score(lead):
    """Mutates and returns lead with score (0-100), tier, reasons and pitch."""
    cat = BY_KEY[lead["category"]]
    a = lead.get("audit") or {}
    status = a.get("site_status", "unchecked")
    pts, reasons = cat.fit, [f"{cat.label}: high inquiry volume" if cat.fit >= 24 else cat.label]

    # Reachability: you can only pitch who you can contact.
    has_phone, has_email = bool(lead.get("phone")), bool(lead.get("email"))
    if has_phone:
        pts += 12
    if has_email:
        pts += 8
    if lead.get("whatsapp") or a.get("whatsapp_link"):
        pts += 5
    if not (has_phone or has_email or lead.get("website")):
        reasons.append("no public contact found; visit or find details manually")

    # Digital gap: the core buying signal.
    if a.get("chatbot"):
        pts -= 25
        reasons.append("already uses " + ", ".join(a["chatbot"]))
    elif status == "ok":
        pts += 20
        reasons.append("has a website but no chat/bot widget")
        if not a.get("booking"):
            pts += 8
            reasons.append("no online booking")
        if a.get("whatsapp_link"):
            pts += 5
            reasons.append("uses WhatsApp manually (click-to-chat, no automation)")
        if not a.get("mobile_friendly"):
            reasons.append("site not mobile-friendly (upsell)")
    elif status in ("none", "social_only", "directory_only"):
        pts += 10
        reasons.append({"none": "no website",
                        "social_only": "only a social page, no website",
                        "directory_only": "only a directory listing, no own website"}[status])
    elif status == "unchecked":
        pts += 10 if lead.get("website") else 8
    else:
        pts += 6
        reasons.append(f"website unreachable ({status})")

    # Small/mid business fit: national chains decide centrally.
    if lead.get("brand"):
        pts -= 15
        reasons.append("part of a chain/brand (harder sale)")
    else:
        pts += 10

    hours = lead.get("opening_hours", "")
    if hours and "24/7" not in hours:
        pts += 5
        reasons.append("fixed hours: bot can capture after-hours inquiries")

    lead["score"] = max(0, min(100, pts))
    lead["tier"] = "A" if lead["score"] >= 70 else "B" if lead["score"] >= 50 else "C"
    lead["reasons"] = "; ".join(reasons)
    lead["pitch"] = cat.pitch if not a.get("chatbot") else \
        "Already has chat: pitch WhatsApp/CRM automation or a smarter AI upgrade"
    if status in ("none", "social_only", "directory_only") and not a.get("chatbot"):
        lead["pitch"] += " (start with WhatsApp Business automation; no website needed)"
    return lead
