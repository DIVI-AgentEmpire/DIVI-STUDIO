"""Check a business's own public website for signals that it needs (or already has) automation.

Only the business's own site is fetched (homepage + one contact page), and only
where robots.txt allows. Social networks are never fetched.
"""

import re
from html import unescape
from urllib.parse import urljoin, urlparse

# Never fetched, even if listed as the "website".
SOCIAL_DOMAINS = (
    "instagram.com", "linkedin.com", "facebook.com", "fb.com", "twitter.com", "x.com",
    "youtube.com", "threads.net", "pinterest.com",
)
# Directory / aggregator pages are not the business's own site.
DIRECTORY_DOMAINS = (
    "justdial.com", "practo.com", "sulekha.com", "indiamart.com", "zomato.com",
    "swiggy.com", "google.com", "goo.gl", "g.page", "business.site", "magicpin.in",
    "lybrate.com", "urbancompany.com",
)

CHATBOT_SIGNATURES = {
    "Tawk.to": ("embed.tawk.to",),
    "Intercom": ("widget.intercom.io", "js.intercomcdn.com"),
    "Drift": ("js.driftt.com", "drift.com/include"),
    "Crisp": ("client.crisp.chat",),
    "Tidio": ("code.tidio.co",),
    "Zendesk": ("static.zdassets.com", "zopim"),
    "Freshchat": ("wchat.freshchat.com", "freshworks.com/widget", "fw-cdn.com"),
    "HubSpot chat": ("js.hs-scripts.com", "js.usemessages.com"),
    "Zoho SalesIQ": ("salesiq.zoho",),
    "LiveChat": ("cdn.livechatinc.com",),
    "Landbot": ("landbot.io",),
    "Botpress": ("botpress.cloud", "cdn.botpress"),
    "Dialogflow": ("dialogflow", "df-messenger"),
    "Haptik": ("haptik.ai", "haptikapi"),
    "Yellow.ai": ("yellow.ai", "yellowmessenger"),
    "Verloop": ("verloop.io",),
    "Wati": ("wati.io",),
    "Interakt": ("interakt.ai", "interakt.shop"),
    "Gallabox": ("gallabox.com",),
    "AiSensy": ("aisensy.com",),
    "Kommunicate": ("kommunicate.io",),
    "Chatbase": ("chatbase.co",),
    "Voiceflow": ("voiceflow.com",),
    "Smartsupp": ("smartsupp.com",),
    "Olark": ("static.olark.com",),
    "Jivo": ("jivosite.com", "code.jivo"),
    "ManyChat": ("manychat.com",),
    "Elfsight chat": ("elfsight.com/all-in-one-chat",),
}
BOOKING_SIGNATURES = (
    "calendly.com", "practo.com", "setmore.com", "fresha.com", "simplybook", "acuityscheduling",
    "booksy.com", "zoho.com/bookings", "appointy", "youcanbook.me", "picktime", "vagaro",
    "book-appointment", "book-an-appointment", "bookappointment", "online-booking",
    "book now", "book appointment", "book an appointment", "schedule appointment",
)
WHATSAPP_RE = re.compile(r"(?:wa\.me/|api\.whatsapp\.com/send|web\.whatsapp\.com/send|whatsapp://send)[^\"'\s<>]*", re.I)
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
TEL_RE = re.compile(r"href=[\"']tel:([^\"']+)[\"']", re.I)
INDIAN_PHONE_RE = re.compile(r"(?<![\d])(?:\+91[\s-]?|0)?[6-9]\d{4}[\s-]?\d{5}(?![\d])")
LINK_RE = re.compile(r"<a\b[^>]*href=[\"']([^\"'#]+)[\"'][^>]*>(.*?)</a>", re.I | re.S)
BAD_EMAIL_PARTS = ("example.", "sentry", "wixpress", "domain.com", "yourname", "email.com",
                   "@2x", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", "u003e")


def domain_of(url):
    host = urlparse(url if "://" in url else "http://" + url).netloc.lower()
    return host[4:] if host.startswith("www.") else host


def is_blocked(url, domains):
    d = domain_of(url)
    return any(d == x or d.endswith("." + x) for x in domains)


def normalize_url(url):
    url = (url or "").strip().split()[0] if url and url.strip() else ""
    if not url:
        return ""
    if not url.startswith(("http://", "https://")):
        url = "https://" + url.lstrip("/")
    return url


def normalize_phone(raw):
    digits = re.sub(r"\D", "", raw or "")
    if digits.startswith("91") and len(digits) == 12:
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 11:
        digits = digits[1:]
    if len(digits) == 10 and digits[0] in "6789":  # mobiles and 080 Bengaluru landlines
        return "+91 " + digits[:5] + " " + digits[5:]
    return raw.strip() if raw else ""


def extract_emails(html, site_domain=""):
    text = unescape(html).replace("[at]", "@").replace("(at)", "@")
    found = []
    for e in EMAIL_RE.findall(text):
        e = e.strip(".").lower()
        if any(b in e for b in BAD_EMAIL_PARTS) or e in found:
            continue
        found.append(e)
    # Prefer addresses on the business's own domain, then common providers.
    found.sort(key=lambda e: (0 if site_domain and e.endswith("@" + site_domain) else 1))
    return found[:3]


def extract_phones(html):
    raw = TEL_RE.findall(html) + INDIAN_PHONE_RE.findall(re.sub(r"<[^>]+>", " ", html))
    out = []
    for p in raw:
        n = normalize_phone(p)
        if n and n.startswith("+91") and n not in out:
            out.append(n)
    return out[:3]


def detect(html):
    low = html.lower()
    chatbots = [name for name, sigs in CHATBOT_SIGNATURES.items() if any(s in low for s in sigs)]
    wa = WHATSAPP_RE.search(html)
    return {
        "chatbot": chatbots,
        "booking": any(s in low for s in BOOKING_SIGNATURES),
        "whatsapp_link": wa.group(0) if wa else "",
        "contact_form": bool(re.search(r"<form\b[^>]*>(?:(?!</form>).)*(?:email|phone|message)", low, re.S)),
        "mobile_friendly": 'name="viewport"' in low or "name='viewport'" in low,
        "wordpress": "wp-content" in low,
        "wix": "wix.com" in low or "wixstatic" in low,
    }


def find_contact_page(html, base_url):
    base_dom = domain_of(base_url)
    for href, text in LINK_RE.findall(html):
        label = (href + " " + re.sub(r"<[^>]+>", "", text)).lower()
        if "contact" in label or "reach-us" in label or "get-in-touch" in label:
            full = urljoin(base_url, href.strip())
            if full.startswith("http") and domain_of(full) == base_dom:
                return full
    return ""


def audit_site(url, fetcher):
    """Return a dict of website signals. Empty-ish result if no usable site."""
    url = normalize_url(url)
    result = {"site_status": "none", "final_url": "", "chatbot": [], "booking": False,
              "whatsapp_link": "", "contact_form": False, "mobile_friendly": False,
              "https": False, "emails": [], "phones": []}
    if not url:
        return result
    if is_blocked(url, SOCIAL_DOMAINS):
        result["site_status"] = "social_only"
        return result
    if is_blocked(url, DIRECTORY_DOMAINS):
        result["site_status"] = "directory_only"
        return result

    page = fetcher.get_page(url)
    if (not page or not page["html"]) and url.startswith("https://"):
        page = fetcher.get_page("http://" + url[len("https://"):])
    if not page or not page["html"]:
        result["site_status"] = str(page["status"]) if page else "error"
        return result

    html, final = page["html"], page["url"]
    dom = domain_of(final)
    result.update(detect(html))
    result["site_status"] = "ok"
    result["final_url"] = final
    result["https"] = final.startswith("https://")
    emails, phones = extract_emails(html, dom), extract_phones(html)

    contact = find_contact_page(html, final)
    if contact and contact != final:
        cpage = fetcher.get_page(contact)
        if cpage and cpage["html"]:
            extra = detect(cpage["html"])
            result["chatbot"] = sorted(set(result["chatbot"]) | set(extra["chatbot"]))
            result["whatsapp_link"] = result["whatsapp_link"] or extra["whatsapp_link"]
            result["contact_form"] = result["contact_form"] or extra["contact_form"]
            result["booking"] = result["booking"] or extra["booking"]
            emails += [e for e in extract_emails(cpage["html"], dom) if e not in emails]
            phones += [p for p in extract_phones(cpage["html"]) if p not in phones]
    result["emails"], result["phones"] = emails[:3], phones[:3]
    return result
