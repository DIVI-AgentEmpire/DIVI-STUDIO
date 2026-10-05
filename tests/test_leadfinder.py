import json
import tempfile
import unittest
from pathlib import Path

from leadfinder import audit, overpass, pipeline, report
from leadfinder.categories import BY_KEY

FIX = Path(__file__).parent / "fixtures"

SITE_NO_BOT = """<html><head><meta name="viewport" content="width=device-width"></head><body>
<a href="https://wa.me/919845012345">Chat on WhatsApp</a>
<a href="/contact-us">Contact</a> Call 98450 12345</body></html>"""
CONTACT_PAGE = """<html><body>Write to info@smilecare.example or front.desk@gmail.com
<img src="logo@2x.png"><form><input name="email"><textarea name="message"></textarea></form></body></html>"""
SITE_WITH_BOT = """<html><body><script src="https://embed.tawk.to/abc/default"></script>
<a href="https://calendly.com/x">Book appointment</a></body></html>"""


class FakeFetcher:
    pages = {
        "https://smilecare.example": {"url": "https://smilecare.example/", "status": 200, "html": SITE_NO_BOT},
        "https://smilecare.example/contact-us": {"url": "https://smilecare.example/contact-us", "status": 200, "html": CONTACT_PAGE},
        "https://chatgym.example": {"url": "https://chatgym.example/", "status": 200, "html": SITE_WITH_BOT},
    }

    def __init__(self):
        self.requested = []

    def get_page(self, url):
        self.requested.append(url)
        return self.pages.get(url, {"url": url, "status": "error: ConnectionError", "html": ""})


def load_fixture():
    data = json.loads((FIX / "overpass_sample.json").read_text())
    return [b for b in map(overpass.element_to_business, data["elements"]) if b]


class TestOverpass(unittest.TestCase):
    def test_parse_skips_unnamed_and_maps_tags(self):
        leads = load_fixture()
        self.assertEqual(len(leads), 5)
        gym = next(l for l in leads if l["name"] == "Cult Fit")
        self.assertEqual((gym["category"], gym["lat"], gym["brand"]), ("fitness", 12.97, "Cult.fit"))

    def test_query_has_all_tags(self):
        q = overpass.build_query(BY_KEY["dental"], "(around:1000,1,2)", 50)
        self.assertIn('nwr["amenity"="dentist"]["name"](around:1000,1,2);', q)
        self.assertIn('nwr["healthcare"="dentist"]', q)
        self.assertTrue(q.endswith("out tags center 50;"))


class TestAudit(unittest.TestCase):
    def test_site_without_bot(self):
        f = FakeFetcher()
        a = audit.audit_site("smilecare.example", f)
        self.assertEqual(a["site_status"], "ok")
        self.assertEqual(a["chatbot"], [])
        self.assertFalse(a["booking"])
        self.assertIn("wa.me/919845012345", a["whatsapp_link"])
        self.assertEqual(a["emails"][0], "info@smilecare.example")
        self.assertNotIn("logo@2x.png", a["emails"])
        self.assertEqual(a["phones"], ["+91 98450 12345"])
        self.assertTrue(a["contact_form"])

    def test_detects_existing_bot_and_booking(self):
        a = audit.audit_site("https://chatgym.example", FakeFetcher())
        self.assertEqual(a["chatbot"], ["Tawk.to"])
        self.assertTrue(a["booking"])

    def test_never_fetches_social_or_directories(self):
        f = FakeFetcher()
        for url in ("https://www.instagram.com/x", "linkedin.com/company/x", "https://m.facebook.com/x",
                    "https://www.justdial.com/Bangalore/x"):
            self.assertIn(audit.audit_site(url, f)["site_status"], ("social_only", "directory_only"))
        self.assertEqual(f.requested, [])

    def test_phone_normalization(self):
        self.assertEqual(audit.normalize_phone("098450-12345"), "+91 98450 12345")
        self.assertEqual(audit.normalize_phone("+91 98450 12345"), "+91 98450 12345")
        self.assertEqual(audit.normalize_phone("080 4123 4567"), "+91 80412 34567")


class TestPipeline(unittest.TestCase):
    def test_end_to_end_ranking_and_reports(self):
        leads = pipeline.enrich(load_fixture(), FakeFetcher(), workers=2)
        leads = pipeline.rank(leads)
        names = [l["name"] for l in leads]
        self.assertEqual(names[0], "Smile Care Dental")
        self.assertEqual(leads[0]["tier"], "A")
        self.assertEqual(leads[0]["email"], "info@smilecare.example")  # enriched from site
        gym = next(l for l in leads if l["name"] == "Cult Fit")
        self.assertEqual(gym["tier"], "C")  # chain + already has a bot
        self.assertIn("Tawk.to", gym["reasons"])
        salon = next(l for l in leads if l["name"] == "Glow Salon")
        self.assertIn("only a social page", salon["reasons"])
        self.assertEqual(salon["phone"], "+91 80412 34567")

        with tempfile.TemporaryDirectory() as d:
            report.write_csv(leads, Path(d) / "l.csv")
            report.write_html(leads, Path(d) / "l.html")
            csv_text = (Path(d) / "l.csv").read_text()
            self.assertIn("outreach_status", csv_text.splitlines()[0])
            self.assertIn("Smile Care Dental", (Path(d) / "l.html").read_text())

    def test_dedupe_merges_fields(self):
        a = {"name": "Smile Care", "phone": "9845012345", "email": ""}
        b = {"name": "SMILE CARE.", "phone": "+91 98450 12345", "email": "x@y.in"}
        out = pipeline.dedupe([a, b])
        self.assertEqual(len(out), 1)
        self.assertEqual(out[0]["email"], "x@y.in")

    def test_csv_import(self):
        with tempfile.NamedTemporaryFile("w", suffix=".csv", delete=False) as f:
            f.write("Name,Category,Phone,Website\nAcme Tutorials,coaching,9876543210,\nNo Cat,,,\n")
        leads = pipeline.rank(pipeline.load_csv(f.name))
        self.assertEqual({l["category"] for l in leads}, {"coaching", "professional"})
        self.assertEqual(leads[0]["name"], "Acme Tutorials")


if __name__ == "__main__":
    unittest.main()
