// Fictional store and sample data. Nothing here refers to a real business or person.

import { addDays, todayIST, weekday } from "./dates.js";

export const STORE = {
  name: "Hasiru Basket (demo)",
  city: "Bengaluru",
  about: "Fictional grocery and daily milk subscription store used to demo an AI WhatsApp assistant. All data is sample data.",
  deliveryAreas: ["HSR Layout", "Koramangala", "BTM Layout", "Bellandur", "JP Nagar", "Jayanagar", "Indiranagar"],
  deliveryFee: 25,
  freeDeliveryAbove: 199,
  payment: ["UPI", "Cash on delivery", "Hasiru wallet"],
  supportHours: "Human team: 9 AM to 7 PM, all days. Assistant: 24x7.",
  subscriptionCutoff: "Pause/skip for a day must be done before 10 PM the previous night.",
  milkDeliveryWindow: "6:00 AM to 7:00 AM",
  newOrders: "In this demo, new orders are placed in the Hasiru Basket app; the assistant answers questions and manages existing orders and subscriptions.",
};

// kn = Kannada name, aliases include common romanised Kannada / Hindi words people type.
export const CATALOG = [
  { sku: "MILK-TONED-500", name: "Toned milk 500 ml", kn: "ಟೋನ್ಡ್ ಹಾಲು 500 ಮಿ.ಲೀ", aliases: ["milk", "haalu", "halu", "doodh", "ಹಾಲು"], category: "Dairy", price: 27, inStock: true },
  { sku: "MILK-FULL-500", name: "Full cream milk 500 ml", kn: "ಫುಲ್ ಕ್ರೀಮ್ ಹಾಲು 500 ಮಿ.ಲೀ", aliases: ["milk", "haalu", "halu", "ಹಾಲು"], category: "Dairy", price: 33, inStock: true },
  { sku: "MILK-A2-1L", name: "A2 cow milk 1 L (glass bottle)", kn: "A2 ಹಸುವಿನ ಹಾಲು 1 ಲೀ", aliases: ["milk", "a2", "haalu", "ಹಾಲು"], category: "Dairy", price: 110, inStock: true },
  { sku: "CURD-400", name: "Curd 400 g", kn: "ಮೊಸರು 400 ಗ್ರಾಂ", aliases: ["curd", "mosaru", "dahi", "yogurt", "ಮೊಸರು"], category: "Dairy", price: 30, inStock: true },
  { sku: "BUTTERMILK-200", name: "Masala buttermilk 200 ml", kn: "ಮಸಾಲ ಮಜ್ಜಿಗೆ 200 ಮಿ.ಲೀ", aliases: ["buttermilk", "majjige", "chaas", "ಮಜ್ಜಿಗೆ"], category: "Dairy", price: 15, inStock: true },
  { sku: "PANEER-200", name: "Fresh paneer 200 g", kn: "ಪನೀರ್ 200 ಗ್ರಾಂ", aliases: ["paneer", "ಪನೀರ್"], category: "Dairy", price: 95, inStock: true },
  { sku: "BUTTER-100", name: "Butter 100 g", kn: "ಬೆಣ್ಣೆ 100 ಗ್ರಾಂ", aliases: ["butter", "benne", "ಬೆಣ್ಣೆ"], category: "Dairy", price: 58, inStock: true },
  { sku: "GHEE-500", name: "Cow ghee 500 ml", kn: "ತುಪ್ಪ 500 ಮಿ.ಲೀ", aliases: ["ghee", "tuppa", "thuppa", "ತುಪ್ಪ"], category: "Dairy", price: 365, inStock: true },
  { sku: "EGGS-6", name: "Farm eggs, pack of 6", kn: "ಮೊಟ್ಟೆ 6", aliases: ["egg", "eggs", "motte", "ಮೊಟ್ಟೆ"], category: "Eggs & bakery", price: 48, inStock: true },
  { sku: "EGGS-30", name: "Farm eggs, tray of 30", kn: "ಮೊಟ್ಟೆ 30", aliases: ["egg", "eggs", "motte", "tray", "ಮೊಟ್ಟೆ"], category: "Eggs & bakery", price: 215, inStock: true },
  { sku: "BREAD-WHITE", name: "White bread 400 g", kn: "ಬಿಳಿ ಬ್ರೆಡ್", aliases: ["bread", "ಬ್ರೆಡ್"], category: "Eggs & bakery", price: 45, inStock: true },
  { sku: "BREAD-BROWN", name: "Brown bread 400 g", kn: "ಬ್ರೌನ್ ಬ್ರೆಡ್", aliases: ["bread", "brown", "ಬ್ರೆಡ್"], category: "Eggs & bakery", price: 55, inStock: true },
  { sku: "RICE-SONA-5", name: "Sona Masoori rice 5 kg", kn: "ಸೋನಾ ಮಸೂರಿ ಅಕ್ಕಿ 5 ಕೆಜಿ", aliases: ["rice", "akki", "chawal", "ಅಕ್ಕಿ"], category: "Staples", price: 375, inStock: true },
  { sku: "RAGI-FLOUR-1", name: "Ragi flour 1 kg", kn: "ರಾಗಿ ಹಿಟ್ಟು 1 ಕೆಜಿ", aliases: ["ragi", "hittu", "flour", "ರಾಗಿ"], category: "Staples", price: 68, inStock: true },
  { sku: "ATTA-5", name: "Whole wheat atta 5 kg", kn: "ಗೋಧಿ ಹಿಟ್ಟು 5 ಕೆಜಿ", aliases: ["atta", "wheat", "godhi", "flour", "ಗೋಧಿ"], category: "Staples", price: 245, inStock: true },
  { sku: "TOOR-DAL-1", name: "Toor dal 1 kg", kn: "ತೊಗರಿ ಬೇಳೆ 1 ಕೆಜಿ", aliases: ["dal", "toor", "togari", "bele", "ತೊಗರಿ"], category: "Staples", price: 165, inStock: true },
  { sku: "SUGAR-1", name: "Sugar 1 kg", kn: "ಸಕ್ಕರೆ 1 ಕೆಜಿ", aliases: ["sugar", "sakkare", "ಸಕ್ಕರೆ"], category: "Staples", price: 48, inStock: true },
  { sku: "JAGGERY-1", name: "Jaggery 1 kg", kn: "ಬೆಲ್ಲ 1 ಕೆಜಿ", aliases: ["jaggery", "bella", "gud", "ಬೆಲ್ಲ"], category: "Staples", price: 90, inStock: true },
  { sku: "OIL-SUN-1", name: "Sunflower oil 1 L", kn: "ಸೂರ್ಯಕಾಂತಿ ಎಣ್ಣೆ 1 ಲೀ", aliases: ["oil", "enne", "sunflower", "ಎಣ್ಣೆ"], category: "Staples", price: 155, inStock: true },
  { sku: "COFFEE-500", name: "Filter coffee powder 500 g", kn: "ಫಿಲ್ಟರ್ ಕಾಫಿ ಪುಡಿ 500 ಗ್ರಾಂ", aliases: ["coffee", "kaafi", "kafi", "pudi", "ಕಾಫಿ"], category: "Staples", price: 260, inStock: true },
  { sku: "TOMATO-1", name: "Tomato 1 kg", kn: "ಟೊಮೇಟೊ 1 ಕೆಜಿ", aliases: ["tomato", "tamate", "tomoto", "ಟೊಮೇಟೊ", "vegetable", "tarakari"], category: "Vegetables", price: 32, inStock: true },
  { sku: "ONION-1", name: "Onion 1 kg", kn: "ಈರುಳ್ಳಿ 1 ಕೆಜಿ", aliases: ["onion", "eerulli", "irulli", "ಈರುಳ್ಳಿ", "vegetable", "tarakari"], category: "Vegetables", price: 38, inStock: true },
  { sku: "POTATO-1", name: "Potato 1 kg", kn: "ಆಲೂಗಡ್ಡೆ 1 ಕೆಜಿ", aliases: ["potato", "aloo", "alugadde", "ಆಲೂಗಡ್ಡೆ", "vegetable", "tarakari"], category: "Vegetables", price: 42, inStock: true },
  { sku: "BEANS-500", name: "Beans 500 g", kn: "ಹುರುಳಿಕಾಯಿ 500 ಗ್ರಾಂ", aliases: ["beans", "hurali", "huruli", "ಹುರುಳಿಕಾಯಿ", "vegetable", "tarakari"], category: "Vegetables", price: 40, inStock: true },
  { sku: "CARROT-500", name: "Carrot 500 g", kn: "ಕ್ಯಾರೆಟ್ 500 ಗ್ರಾಂ", aliases: ["carrot", "gajjari", "ಗಜ್ಜರಿ", "vegetable", "tarakari"], category: "Vegetables", price: 35, inStock: true },
  { sku: "CORIANDER", name: "Coriander leaves (bunch)", kn: "ಕೊತ್ತಂಬರಿ ಸೊಪ್ಪು", aliases: ["coriander", "kottambari", "dhania", "soppu", "ಕೊತ್ತಂಬರಿ"], category: "Vegetables", price: 10, inStock: true },
  { sku: "SPINACH", name: "Palak / spinach (bunch)", kn: "ಪಾಲಕ್ ಸೊಪ್ಪು", aliases: ["spinach", "palak", "soppu", "ಪಾಲಕ್"], category: "Vegetables", price: 25, inStock: false },
  { sku: "COCONUT-1", name: "Coconut (1 pc)", kn: "ತೆಂಗಿನಕಾಯಿ", aliases: ["coconut", "tengina", "kayi", "ತೆಂಗಿನಕಾಯಿ"], category: "Vegetables", price: 38, inStock: true },
  { sku: "BANANA-YELAKKI-1", name: "Yelakki banana 1 kg", kn: "ಏಲಕ್ಕಿ ಬಾಳೆಹಣ್ಣು 1 ಕೆಜಿ", aliases: ["banana", "bale", "baale", "hannu", "yelakki", "ಬಾಳೆಹಣ್ಣು", "fruit"], category: "Fruits", price: 80, inStock: true },
  { sku: "APPLE-1", name: "Shimla apple 1 kg", kn: "ಸೇಬು 1 ಕೆಜಿ", aliases: ["apple", "sebu", "ಸೇಬು", "fruit", "hannu"], category: "Fruits", price: 180, inStock: true },
  { sku: "MANGO-ALPHONSO-1", name: "Alphonso mango 1 kg", kn: "ಆಲ್ಫೋನ್ಸೋ ಮಾವಿನಹಣ್ಣು 1 ಕೆಜಿ", aliases: ["mango", "mavu", "maavu", "ಮಾವು", "fruit", "hannu"], category: "Fruits", price: 320, inStock: false },
];

export const bySku = (sku) => CATALOG.find((p) => p.sku === sku);

// Delivery slots offered every day. Capacity is pseudo-random but stable per date+slot.
export const SLOT_TIMES = [
  { code: "S1", label: "6:00 AM – 8:00 AM", startMin: 6 * 60 },
  { code: "S2", label: "8:00 AM – 10:00 AM", startMin: 8 * 60 },
  { code: "S3", label: "5:00 PM – 7:00 PM", startMin: 17 * 60 },
  { code: "S4", label: "7:00 PM – 9:00 PM", startMin: 19 * 60 },
];

export function slotCapacity(date, code) {
  let h = 0;
  for (const c of date + code) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h % 5; // 0 means full
}

// Every new WhatsApp number gets its own copy of this sample customer, so anyone can try the demo.
export function newCustomer(phone, name, now = new Date()) {
  const today = todayIST(now);
  return {
    phone,
    name: name || "Demo customer",
    address: "Flat 302, Sample Residency, 4th Cross, HSR Layout Sector 2, Bengaluru (sample address)",
    createdAt: now.toISOString(),
    orders: [
      {
        id: "HB-1045", placedOn: today, status: "Out for delivery",
        deliveryDate: today, slot: "5:00 PM – 7:00 PM", rider: "Manju (demo rider)",
        items: [["TOMATO-1", 1], ["ONION-1", 2], ["CORIANDER", 1], ["EGGS-6", 1]],
      },
      {
        id: "HB-1046", placedOn: today, status: "Confirmed – delivery slot not chosen yet",
        deliveryDate: null, slot: null,
        items: [["RICE-SONA-5", 1], ["TOOR-DAL-1", 1], ["OIL-SUN-1", 1]],
      },
      {
        id: "HB-1038", placedOn: addDays(today, -4), status: "Delivered",
        deliveryDate: addDays(today, -3), slot: "8:00 AM – 10:00 AM",
        items: [["RAGI-FLOUR-1", 1], ["COFFEE-500", 1], ["BANANA-YELAKKI-1", 1]],
      },
    ],
    subscription: {
      id: "SUB-501",
      status: "active",
      startedOn: addDays(today, -60),
      window: STORE.milkDeliveryWindow,
      items: [
        { sku: "MILK-TONED-500", qty: 2, days: "daily" },
        { sku: "CURD-400", qty: 1, days: ["Monday", "Wednesday", "Friday"] },
      ],
      pauses: [], // [{ from, to }]
      skips: [], // ["YYYY-MM-DD"]
    },
    handover: { active: false, until: null, reason: null },
    history: [],
  };
}

export function itemsOn(sub, date) {
  return sub.items.filter((i) => i.days === "daily" || i.days.includes(weekday(date)));
}

export function orderTotal(order) {
  const subtotal = order.items.reduce((s, [sku, qty]) => s + bySku(sku).price * qty, 0);
  const fee = subtotal >= STORE.freeDeliveryAbove ? 0 : STORE.deliveryFee;
  return { subtotal, deliveryFee: fee, total: subtotal + fee };
}
