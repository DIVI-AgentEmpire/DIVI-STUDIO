"""Business categories, their OpenStreetMap tags, and how well they fit an AI chatbot pitch.

`fit` (0-30) reflects how much of the business runs on repetitive inbound
inquiries (bookings, prices, timings, admissions), which is what a chatbot or
WhatsApp automation takes over.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class Category:
    key: str
    label: str
    tags: tuple  # (key, value) pairs; any match counts
    fit: int
    pitch: str


CATEGORIES = [
    Category("dental", "Dental clinic",
             (("amenity", "dentist"), ("healthcare", "dentist")), 28,
             "24x7 appointment booking + reminder bot on WhatsApp and website"),
    Category("clinic", "Clinic / doctor",
             (("amenity", "clinic"), ("amenity", "doctors"), ("healthcare", "clinic"),
              ("healthcare", "doctor")), 27,
             "Appointment booking, doctor timings and FAQ bot; cut front-desk calls"),
    Category("physio", "Physiotherapy",
             (("healthcare", "physiotherapist"),), 24,
             "Session booking, package reminders and follow-up automation"),
    Category("diagnostics", "Diagnostic lab",
             (("healthcare", "laboratory"),), 22,
             "Test price/prep FAQ bot, home-collection booking, report-ready alerts"),
    Category("vet", "Veterinary / pet care",
             (("amenity", "veterinary"), ("shop", "pet_grooming")), 22,
             "Vaccination reminders and appointment bot"),
    Category("salon", "Salon / spa / beauty",
             (("shop", "hairdresser"), ("shop", "beauty"), ("shop", "massage"),
              ("leisure", "spa")), 26,
             "WhatsApp booking bot, no-show reminders, offer broadcasts to opted-in clients"),
    Category("fitness", "Gym / yoga / fitness",
             (("leisure", "fitness_centre"), ("sport", "yoga")), 24,
             "Trial-class lead capture bot, membership renewal reminders"),
    Category("coaching", "Coaching / training institute",
             (("amenity", "language_school"), ("amenity", "music_school"),
              ("amenity", "driving_school"), ("amenity", "prep_school"),
              ("office", "educational_institution"), ("amenity", "training")), 26,
             "Admissions inquiry bot: fees, batches, demo-class booking, lead qualification"),
    Category("preschool", "Preschool / daycare",
             (("amenity", "kindergarten"), ("amenity", "childcare")), 22,
             "Admissions FAQ + campus-visit booking bot"),
    Category("real_estate", "Real estate agent",
             (("office", "estate_agent"), ("shop", "estate_agent")), 27,
             "Lead qualification bot (budget/location), site-visit scheduling, follow-ups"),
    Category("interior", "Interior design / furnishing",
             (("shop", "interior_decoration"), ("craft", "interior_work"), ("shop", "kitchen")), 20,
             "Quote-request intake bot with photo/measurement collection"),
    Category("hotel", "Hotel / guest house",
             (("tourism", "hotel"), ("tourism", "guest_house"), ("tourism", "hostel")), 22,
             "Direct-booking and guest FAQ bot to reduce OTA commissions"),
    Category("travel", "Travel agency",
             (("shop", "travel_agency"), ("office", "travel_agent")), 22,
             "Itinerary inquiry bot, quote follow-ups"),
    Category("professional", "CA / lawyer / insurance",
             (("office", "accountant"), ("office", "tax_advisor"), ("office", "lawyer"),
              ("office", "insurance"), ("office", "financial")), 20,
             "Client intake + document-collection automation, deadline reminders"),
    Category("auto", "Car / bike dealer & service",
             (("shop", "car"), ("shop", "car_repair"), ("shop", "motorcycle")), 18,
             "Service booking bot, service-due reminders"),
    Category("events", "Event venue / wedding",
             (("amenity", "events_venue"), ("shop", "wedding")), 18,
             "Availability and quote inquiry bot"),
    Category("optician", "Optician",
             (("shop", "optician"),), 16,
             "Eye-test booking and order-ready notifications"),
    Category("restaurant", "Restaurant / cafe",
             (("amenity", "restaurant"), ("amenity", "cafe")), 12,
             "Table reservation + catering inquiry bot"),
]

BY_KEY = {c.key: c for c in CATEGORIES}

# Low-fit or very high-volume categories are opt-in.
DEFAULT_KEYS = [c.key for c in CATEGORIES if c.key not in ("restaurant",)]


def classify(tags: dict):
    """Return the first category whose tags match an OSM element's tags."""
    for cat in CATEGORIES:
        for k, v in cat.tags:
            if tags.get(k) == v:
                return cat
    return None
