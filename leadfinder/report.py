"""Write the ranked list as CSV (for a spreadsheet/CRM) and a self-contained HTML report."""

import csv
import html
import json
from datetime import date
from urllib.parse import quote_plus

from .categories import BY_KEY

CSV_FIELDS = ["rank", "score", "tier", "name", "category", "locality", "address", "phone",
              "whatsapp", "email", "website", "site_status", "chatbot_found", "online_booking",
              "reasons", "pitch", "maps_link", "source",
              "outreach_status", "last_contacted", "notes"]  # last three: for you to fill in


def maps_link(lead):
    if lead.get("lat") and lead.get("lon"):
        q = f"{lead['name']} @{lead['lat']},{lead['lon']}"
    else:
        q = f"{lead['name']} {lead.get('address') or lead.get('locality', '')} Bengaluru"
    return "https://www.google.com/maps/search/?api=1&query=" + quote_plus(q)


def whatsapp_link(lead):
    a = lead.get("audit") or {}
    if lead.get("whatsapp"):
        digits = "".join(c for c in lead["whatsapp"] if c.isdigit())
        return "https://wa.me/" + (digits if len(digits) > 10 else "91" + digits[-10:])
    if a.get("whatsapp_link"):
        link = a["whatsapp_link"]
        return link if link.startswith("http") else "https://" + link
    return ""


def flat(lead):
    a = lead.get("audit") or {}
    return {
        **{k: lead.get(k, "") for k in CSV_FIELDS},
        "category": BY_KEY[lead["category"]].label,
        "whatsapp": whatsapp_link(lead),
        "site_status": a.get("site_status", ""),
        "chatbot_found": ", ".join(a.get("chatbot") or []),
        "online_booking": "yes" if a.get("booking") else ("" if a.get("site_status") != "ok" else "no"),
        "maps_link": maps_link(lead),
        "outreach_status": "", "last_contacted": "", "notes": "",
    }


def write_csv(leads, path):
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        w.writeheader()
        for lead in leads:
            w.writerow(flat(lead))


def write_html(leads, path, title="Bengaluru AI Automation Leads"):
    rows = [flat(l) for l in leads]
    data = json.dumps(rows, ensure_ascii=False).replace("</", "<\\/")
    tiers = {t: sum(1 for r in rows if r["tier"] == t) for t in "ABC"}
    doc = TEMPLATE.replace("__TITLE__", html.escape(title)) \
        .replace("__DATE__", date.today().isoformat()) \
        .replace("__TOTAL__", str(len(rows))) \
        .replace("__A__", str(tiers["A"])).replace("__B__", str(tiers["B"])).replace("__C__", str(tiers["C"])) \
        .replace("__DATA__", data)
    with open(path, "w", encoding="utf-8") as f:
        f.write(doc)


TEMPLATE = r"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>__TITLE__</title>
<style>
:root{--bg:#f7f7f5;--card:#fff;--fg:#1d1d1b;--muted:#6b6b66;--line:#e3e2dd;--a:#0f7b4f;--b:#a86a00;--c:#8a8a85;--link:#1f5fbf}
@media (prefers-color-scheme:dark){:root{--bg:#161615;--card:#1f1f1d;--fg:#ececea;--muted:#9a9a94;--line:#33332f;--a:#3fbf86;--b:#e0a83a;--c:#8a8a85;--link:#7aaaf0}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
header{padding:20px 16px 8px;max-width:1400px;margin:auto}h1{font-size:20px;margin:0 0 4px}
.sub{color:var(--muted);font-size:13px}.stats{display:flex;gap:16px;margin:12px 0;flex-wrap:wrap}
.stat{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:8px 12px}.stat b{font-size:18px;display:block}
.controls{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}input,select{font:inherit;padding:6px 8px;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--fg)}
main{max-width:1400px;margin:auto;padding:0 16px 32px}.wrap{overflow-x:auto;background:var(--card);border:1px solid var(--line);border-radius:8px}
table{border-collapse:collapse;width:100%}th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}
th{position:sticky;top:0;background:var(--card);cursor:pointer;white-space:nowrap;font-size:12px;color:var(--muted);text-transform:uppercase;letter-spacing:.03em}
td.num{font-variant-numeric:tabular-nums;text-align:right}.tier{font-weight:700;border-radius:4px;padding:1px 7px;color:#fff}
.tA{background:var(--a)}.tB{background:var(--b)}.tC{background:var(--c)}a{color:var(--link);text-decoration:none}a:hover{text-decoration:underline}
.small{font-size:12px;color:var(--muted);max-width:360px}.name{font-weight:600}.nowrap{white-space:nowrap}
footer{color:var(--muted);font-size:12px;margin-top:16px}
</style></head><body>
<header><h1>__TITLE__</h1>
<div class="sub">Generated __DATE__ · Data © OpenStreetMap contributors (ODbL) and businesses' own public websites. Verify details before contacting.</div>
<div class="stats"><div class="stat"><b>__TOTAL__</b>leads</div><div class="stat"><b>__A__</b>Tier A</div><div class="stat"><b>__B__</b>Tier B</div><div class="stat"><b>__C__</b>Tier C</div></div>
<div class="controls"><input id="q" placeholder="Search name, area, reason…" size="28">
<select id="tier"><option value="">All tiers</option><option>A</option><option>B</option><option>C</option></select>
<select id="cat"><option value="">All categories</option></select>
<select id="contact"><option value="">Any contact</option><option value="phone">Has phone</option><option value="email">Has email</option><option value="whatsapp">Has WhatsApp</option></select></div>
</header>
<main><div class="wrap"><table><thead><tr>
<th data-k="rank">#</th><th data-k="score">Score</th><th data-k="name">Business</th><th data-k="category">Category</th>
<th data-k="locality">Area</th><th>Contact</th><th data-k="reasons">Why it's a lead</th><th>Pitch angle</th></tr></thead>
<tbody id="rows"></tbody></table></div>
<footer>Outreach tips: contact businesses one at a time, introduce yourself, honour any "not interested" immediately, and only message WhatsApp numbers the business publicly lists for customer contact. This tool never sends messages.</footer></main>
<script>
const D=__DATA__;const $=s=>document.querySelector(s);const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const safe=u=>/^https?:\/\//i.test(u||"")?esc(u):"";
[...new Set(D.map(r=>r.category))].sort().forEach(c=>{const o=document.createElement("option");o.textContent=c;$("#cat").appendChild(o)});
let sortK="rank",dir=1;
function render(){const q=$("#q").value.toLowerCase(),t=$("#tier").value,c=$("#cat").value,ct=$("#contact").value;
let r=D.filter(x=>(!t||x.tier===t)&&(!c||x.category===c)&&(!ct||x[ct])&&(!q||(x.name+" "+x.locality+" "+x.address+" "+x.reasons).toLowerCase().includes(q)));
r.sort((a,b)=>{const x=a[sortK],y=b[sortK];return (typeof x==="number"?x-y:String(x).localeCompare(String(y)))*dir});
$("#rows").innerHTML=r.map(x=>{const site=safe(x.website.startsWith("http")?x.website:"https://"+x.website);
const contact=[x.phone?`<a class="nowrap" href="tel:${esc(x.phone.replace(/\s/g,""))}">${esc(x.phone)}</a>`:"",
x.whatsapp?`<a href="${safe(x.whatsapp)}" target="_blank" rel="noopener">WhatsApp</a>`:"",
x.email?`<a href="mailto:${esc(x.email)}">${esc(x.email)}</a>`:"",
x.website&&site?`<a href="${site}" target="_blank" rel="noopener">website</a>`:"",
`<a href="${safe(x.maps_link)}" target="_blank" rel="noopener">map</a>`].filter(Boolean).join("<br>");
return `<tr><td class="num">${x.rank}</td><td class="num"><span class="tier t${x.tier}">${x.score}</span></td>
<td><div class="name">${esc(x.name)}</div><div class="small">${esc(x.address)}</div></td><td>${esc(x.category)}</td><td>${esc(x.locality)}</td>
<td>${contact}</td><td class="small">${esc(x.reasons)}</td><td class="small">${esc(x.pitch)}</td></tr>`}).join("")}
document.querySelectorAll("th[data-k]").forEach(th=>th.onclick=()=>{const k=th.dataset.k;dir=sortK===k?-dir:(k==="score"?-1:1);sortK=k;render()});
["#q","#tier","#cat","#contact"].forEach(s=>$(s).addEventListener("input",render));render();
</script></body></html>
"""
