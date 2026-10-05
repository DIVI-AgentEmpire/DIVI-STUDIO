# DIVI-STUDIO

Tools for a zero-budget AI automation business:

- **[Lead finder](#bengaluru-lead-finder)** (`leadfinder/`): finds and ranks Bengaluru small businesses that could use AI chatbots.
- **[WhatsApp AI assistant demo](whatsapp-assistant/README.md)** (`whatsapp-assistant/`): a sample WhatsApp bot for a fictional grocery and milk subscription store, to show prospective clients.

## Bengaluru Lead Finder

A free command-line tool that finds small and mid-size businesses in Bengaluru that are good
prospects for AI chatbots and automation. It ranks them and gives you their public contact
details, so you can reach out to them yourself.

- **Free sources only.** It uses OpenStreetMap through the public Overpass API, plus each
  business's own website. There are no API keys, no sign-ups, and no card.
- **It never sends anything.** The output is a spreadsheet and a web page. All outreach is up to you.
- **No Instagram, LinkedIn, Facebook, X or YouTube.** Social links are recorded if a business
  lists one, but they are never fetched. Directory sites like Justdial and Practo aren't fetched either.
- **It's polite to websites.** It respects robots.txt, waits between requests, identifies itself
  honestly, caches results for 7 days, and reads at most 2 pages per site (the homepage and the contact page).

## Setup (one time)

You need Python 3.9 or newer.

```bash
git clone <this repo> && cd DIVI-STUDIO
python3 -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Use

```bash
# Start small: one locality, 3 km radius, all default categories
python -m leadfinder --area koramangala

# Specific niches across the whole city
python -m leadfinder --area bengaluru --categories dental,clinic,salon,coaching,real_estate

# Only leads you can actually contact, with a score of 50 or more
python -m leadfinder --area hsr-layout --radius 4000 --require-contact --min-score 50

python -m leadfinder --list-areas         # 20 preset localities, or pass "lat,lon"
python -m leadfinder --list-categories
```

The results go into `output/`:

- **`output/leads.html`**: open it in a browser. You can sort and filter it. Each phone number,
  WhatsApp number and email is a click-to-contact link, and each lead has a map link so you
  can check the business yourself.
- **`output/leads.csv`**: open it in Google Sheets or Excel. It has empty `outreach_status`,
  `last_contacted` and `notes` columns, so you can use it as a simple CRM.

### Adding businesses you found yourself

OpenStreetMap is free, but its coverage is patchy. Many Bengaluru businesses are on it without
a phone number or website. You can add businesses you note down yourself, for example while
browsing a map by hand or walking past shops. The tool then checks their websites and ranks
them alongside the rest:

```csv
name,category,phone,email,website,address,locality
Sharma Dental Care,dental,9876543210,,sharmadental.in,"12 80ft Rd",Indiranagar
```

```bash
python -m leadfinder --import-csv my_list.csv --no-osm      # only your list
python -m leadfinder --area jayanagar --import-csv my_list.csv   # merged and de-duplicated
```

## How leads are scored (0 to 100)

| Signal | Points |
|---|---|
| Category fit: how much of the business is repetitive inquiries like bookings, fees, timings and admissions | up to 28 |
| Phone / email / WhatsApp found | +12 / +8 / +5 |
| Has a website but **no chat widget** | +20 |
| …and no online booking | +8 |
| …and a WhatsApp click-to-chat link but no automation | +5 |
| No website, or only a social or directory page | +10 |
| Independent business (not tagged as part of a chain or brand) | +10 |
| Fixed opening hours, so a bot could handle after-hours questions | +5 |
| **Already uses a chatbot** (it detects about 28 tools, including Tawk.to, Intercom, Wati, Interakt, Gallabox, AiSensy, Haptik and Yellow.ai) | −25 |
| Part of a chain or brand | −15 |

Tiers: **A** is 70 or more, **B** is 50 to 69, **C** is everything else. Each lead also comes
with a plain-English list of *why it's a lead* and a suggested *pitch angle*. For example, a
dental clinic gets "24x7 appointment booking + reminder bot on WhatsApp and website".

## Tips for good results

- Run one locality and a few categories at a time. The public Overpass servers are shared, so
  big whole-city runs can be slow or rate-limited. If a run fails, wait a minute and run it again.
  Anything already fetched is cached.
- Tier A leads usually have a working website, no chat widget and a phone number. Start with those.
- Use `--no-audit` for a fast first pass that doesn't visit any websites.

## Doing outreach responsibly

Contact each business individually and introduce yourself honestly. Stop as soon as someone
says they're not interested, and only use numbers and emails the business publishes for
customer contact. If you call, check the number against the DND/NCPR registry first. Under
India's DPDP Act, keep only the data you need. If you share this data, credit it as
**© OpenStreetMap contributors**.

## Development

```bash
python -m unittest discover -s tests
```
