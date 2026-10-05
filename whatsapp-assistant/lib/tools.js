// Tools the AI can call. Each runs against the current customer's own record only,
// so the model can never read or change another customer's data.

import { CATALOG, SLOT_TIMES, STORE, bySku, itemsOn, orderTotal, slotCapacity } from "./data.js";
import { addDays, isIsoDate, minutesNowIST, prettyDate, todayIST } from "./dates.js";

const MAX_PAUSE_DAYS = 30;
const SLOT_DAYS_AHEAD = 3;
const SLOT_LEAD_MIN = 120; // a slot must start at least 2 hours from now
const CUTOFF_MIN = 22 * 60; // 10 PM: last moment to change tomorrow's milk

const fn = (name, description, properties = {}, required = []) => ({
  type: "function",
  function: { name, description, parameters: { type: "object", properties, required } },
});

export const TOOL_DEFINITIONS = [
  fn("search_products", "Search the catalogue for products, prices and stock. Accepts English, Kannada or romanised Kannada words. Use an empty query to list categories.",
    { query: { type: "string", description: "Product words, e.g. 'milk', 'akki', 'ಮೊಸರು'. Empty for overview." } }),
  fn("get_store_info", "Store policies: delivery areas, delivery fee, payment methods, support hours, subscription cut-off, how new orders are placed."),
  fn("get_order_status", "Get this customer's orders and their status. Pass order_id for one order, or omit for recent orders.",
    { order_id: { type: "string", description: "Order ID like HB-1045" } }),
  fn("list_delivery_slots", "List available delivery slots for the next 3 days, or for one date.",
    { date: { type: "string", description: "YYYY-MM-DD (optional)" } }),
  fn("book_delivery_slot", "Book or change the delivery slot of one of this customer's orders.",
    { order_id: { type: "string" }, slot_id: { type: "string", description: "slot_id from list_delivery_slots, e.g. 2026-10-06_S2" } },
    ["order_id", "slot_id"]),
  fn("get_subscription", "Get the customer's milk subscription and the delivery schedule for the next 7 days."),
  fn("skip_subscription_delivery", "Skip the subscription delivery on one date.",
    { date: { type: "string", description: "YYYY-MM-DD" } }, ["date"]),
  fn("pause_subscription", "Pause the subscription for a date range (inclusive, max 30 days).",
    { start_date: { type: "string", description: "YYYY-MM-DD" }, end_date: { type: "string", description: "YYYY-MM-DD" } },
    ["start_date", "end_date"]),
  fn("resume_subscription", "Cancel all upcoming pauses and skips so deliveries continue as normal from the next possible day."),
  fn("handover_to_human", "Hand the chat to a human team member. Use for complaints, refunds, payment problems, address changes, new orders, explicit requests for a person, or anything the tools cannot do.",
    { reason: { type: "string", description: "Short reason, in English" }, summary: { type: "string", description: "One-line summary of what the customer needs, in English" } },
    ["reason", "summary"]),
];

const fmtItems = (items) => items.map(([sku, qty]) => `${bySku(sku).name} x${qty}`);

function earliestChangeableDate(now) {
  const today = todayIST(now);
  return addDays(today, minutesNowIST(now) < CUTOFF_MIN ? 1 : 2);
}

function scheduleFor(sub, date) {
  if (sub.status !== "active") return "paused";
  if (sub.skips.includes(date)) return "skipped";
  if (sub.pauses.some((p) => date >= p.from && date <= p.to)) return "paused";
  return itemsOn(sub, date).length ? "scheduled" : "no delivery";
}

function slotsFor(date, now) {
  const today = todayIST(now);
  return SLOT_TIMES.map((s) => {
    const tooSoon = date === today && s.startMin < minutesNowIST(now) + SLOT_LEAD_MIN;
    const cap = slotCapacity(date, s.code);
    return { slot_id: `${date}_${s.code}`, date, day: prettyDate(date), time: s.label, available: !tooSoon && cap > 0,
      note: tooSoon ? "too late to book today" : cap === 0 ? "full" : `${cap} left` };
  });
}

const handlers = {
  search_products({ query = "" }) {
    const words = query.toLowerCase().split(/[\s,]+/).filter((w) => w.length > 1);
    if (!words.length) {
      const cats = {};
      for (const p of CATALOG) (cats[p.category] ||= []).push(p.name);
      return { categories: Object.entries(cats).map(([c, names]) => ({ category: c, examples: names.slice(0, 4) })) };
    }
    const scored = CATALOG.map((p) => {
      const hay = [p.name, p.kn, p.category, ...p.aliases].join(" ").toLowerCase();
      return { p, score: words.filter((w) => hay.includes(w)).length };
    }).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
    if (!scored.length) return { results: [], note: "No matching product in the catalogue. Do not guess; offer similar items or a human." };
    return { results: scored.slice(0, 8).map(({ p }) => ({ name: p.name, kannada: p.kn, price_inr: p.price, in_stock: p.inStock, category: p.category })) };
  },

  get_store_info() {
    return STORE;
  },

  get_order_status({ order_id }, { customer }) {
    const fmt = (o) => ({ order_id: o.id, status: o.status, placed_on: o.placedOn,
      delivery: o.deliveryDate ? `${prettyDate(o.deliveryDate)}, ${o.slot}` : "slot not chosen yet",
      rider: o.rider, items: fmtItems(o.items), ...orderTotal(o) });
    if (order_id) {
      const o = customer.orders.find((x) => x.id.toLowerCase() === order_id.trim().toLowerCase());
      return o ? fmt(o) : { error: `No order ${order_id} on this number. Known orders: ${customer.orders.map((x) => x.id).join(", ")}` };
    }
    return { orders: customer.orders.map(fmt) };
  },

  list_delivery_slots({ date }, { now }) {
    const today = todayIST(now);
    const dates = date ? [date] : Array.from({ length: SLOT_DAYS_AHEAD }, (_, i) => addDays(today, i));
    if (date && (!isIsoDate(date) || date < today || date > addDays(today, SLOT_DAYS_AHEAD - 1))) {
      return { error: `Slots can only be booked from ${today} to ${addDays(today, SLOT_DAYS_AHEAD - 1)}.` };
    }
    return { slots: dates.flatMap((d) => slotsFor(d, now)) };
  },

  book_delivery_slot({ order_id, slot_id }, { customer, now }) {
    const o = customer.orders.find((x) => x.id.toLowerCase() === String(order_id).trim().toLowerCase());
    if (!o) return { error: `No order ${order_id} on this number.` };
    if (/delivered|out for delivery/i.test(o.status)) return { error: `Order ${o.id} is "${o.status}"; its slot can no longer be changed. Offer a human if needed.` };
    const [date] = String(slot_id).split("_");
    if (!isIsoDate(date)) return { error: "Invalid slot_id. Use one returned by list_delivery_slots." };
    const slot = slotsFor(date, now).find((s) => s.slot_id === slot_id);
    if (!slot || date < todayIST(now) || date > addDays(todayIST(now), SLOT_DAYS_AHEAD - 1)) return { error: "That slot does not exist. Call list_delivery_slots." };
    if (!slot.available) return { error: `Slot ${slot.day} ${slot.time} is not available (${slot.note}). Suggest another.` };
    o.deliveryDate = date;
    o.slot = slot.time;
    o.status = "Confirmed – slot booked";
    return { ok: true, order_id: o.id, delivery: `${slot.day}, ${slot.time}` };
  },

  get_subscription(_, { customer, now }) {
    const sub = customer.subscription;
    const today = todayIST(now);
    const next7 = Array.from({ length: 7 }, (_, i) => addDays(today, i + 1)).map((d) => ({
      date: d, day: prettyDate(d), status: scheduleFor(sub, d),
      items: itemsOn(sub, d).map((i) => `${bySku(i.sku).name} x${i.qty}`),
    }));
    return {
      subscription_id: sub.id, status: sub.status, delivery_window: sub.window,
      plan: sub.items.map((i) => ({ item: bySku(i.sku).name, qty: i.qty, days: i.days === "daily" ? "daily" : i.days.join(", "), price_each_inr: bySku(i.sku).price })),
      upcoming_pauses: sub.pauses.filter((p) => p.to >= today), upcoming_skips: sub.skips.filter((d) => d >= today),
      next_7_days: next7, cutoff_rule: STORE.subscriptionCutoff, earliest_changeable_date: earliestChangeableDate(now),
    };
  },

  skip_subscription_delivery({ date }, { customer, now }) {
    const sub = customer.subscription;
    const earliest = earliestChangeableDate(now);
    if (!isIsoDate(date)) return { error: "Date must be YYYY-MM-DD." };
    if (date < earliest) return { error: `Too late to change ${prettyDate(date)}. ${STORE.subscriptionCutoff} Earliest date you can change: ${prettyDate(earliest)}.` };
    if (date > addDays(todayIST(now), MAX_PAUSE_DAYS)) return { error: `Can only skip up to ${MAX_PAUSE_DAYS} days ahead.` };
    const state = scheduleFor(sub, date);
    if (state !== "scheduled") return { error: `Nothing to skip on ${prettyDate(date)} (status: ${state}).` };
    sub.skips.push(date);
    return { ok: true, skipped: prettyDate(date), items_skipped: itemsOn(sub, date).map((i) => bySku(i.sku).name) };
  },

  pause_subscription({ start_date, end_date }, { customer, now }) {
    const sub = customer.subscription;
    const earliest = earliestChangeableDate(now);
    if (!isIsoDate(start_date) || !isIsoDate(end_date)) return { error: "Dates must be YYYY-MM-DD." };
    if (end_date < start_date) return { error: "End date is before start date." };
    if (start_date < earliest) return { error: `Too late to pause from ${prettyDate(start_date)}. ${STORE.subscriptionCutoff} Earliest start: ${prettyDate(earliest)}.` };
    const days = (Date.parse(end_date) - Date.parse(start_date)) / 86_400_000 + 1;
    if (days > MAX_PAUSE_DAYS) return { error: `Pauses can be at most ${MAX_PAUSE_DAYS} days. For longer, hand over to a human.` };
    sub.pauses.push({ from: start_date, to: end_date });
    return { ok: true, paused_from: prettyDate(start_date), paused_to: prettyDate(end_date), days, resumes_on: prettyDate(addDays(end_date, 1)) };
  },

  resume_subscription(_, { customer, now }) {
    const sub = customer.subscription;
    const earliest = earliestChangeableDate(now);
    const before = sub.pauses.length + sub.skips.length;
    // Keep anything already locked by the cut-off; drop the rest.
    sub.pauses = sub.pauses.filter((p) => p.from < earliest).map((p) => ({ ...p, to: p.to >= earliest ? addDays(earliest, -1) : p.to }))
      .filter((p) => p.to >= p.from);
    sub.skips = sub.skips.filter((d) => d < earliest);
    sub.status = "active";
    return { ok: true, changes_removed: before - (sub.pauses.length + sub.skips.length), deliveries_resume_from: prettyDate(earliest) };
  },

  async handover_to_human({ reason, summary }, ctx) {
    await ctx.startHandover(reason, summary);
    return { ok: true, note: "A human has been notified. Tell the customer a team member will reply here soon (team hours 9 AM–7 PM), and that they can type BOT to come back to the assistant." };
  },
};

export async function runTool(name, args, ctx) {
  const h = handlers[name];
  if (!h) return { error: `Unknown tool ${name}` };
  try {
    return await h(args || {}, ctx);
  } catch (err) {
    return { error: `Tool failed: ${err.message}` };
  }
}

