import test from "node:test";
import assert from "node:assert/strict";
import { newCustomer } from "../lib/data.js";
import { runTool } from "../lib/tools.js";
import { NOW } from "./helpers.js";

const ctx = (now = NOW) => ({ customer: newCustomer("91980", "T", now), now, startHandover: async () => {} });

test("product search understands English, Kannada script and romanised Kannada", async () => {
  for (const q of ["milk", "ಹಾಲು", "haalu"]) {
    const r = await runTool("search_products", { query: q }, ctx());
    assert.ok(r.results.some((p) => p.name === "Toned milk 500 ml" && p.price_inr === 27), q);
  }
  const none = await runTool("search_products", { query: "iphone" }, ctx());
  assert.equal(none.results.length, 0);
  const spinach = await runTool("search_products", { query: "palak" }, ctx());
  assert.equal(spinach.results[0].in_stock, false);
});

test("order status for one and all orders, scoped to the customer", async () => {
  const c = ctx();
  const one = await runTool("get_order_status", { order_id: "hb-1045" }, c);
  assert.equal(one.status, "Out for delivery");
  assert.equal(one.total, one.subtotal + one.deliveryFee);
  const all = await runTool("get_order_status", {}, c);
  assert.equal(all.orders.length, 3);
  const missing = await runTool("get_order_status", { order_id: "HB-9999" }, c);
  assert.match(missing.error, /No order/);
});

test("slots: past/too-soon slots unavailable, booking works and is validated", async () => {
  const c = ctx();
  const { slots } = await runTool("list_delivery_slots", {}, c);
  assert.equal(slots.length, 12);
  const todayMorning = slots.find((s) => s.slot_id === "2026-10-05_S1");
  assert.equal(todayMorning.available, false); // it's 11 AM
  const free = slots.find((s) => s.available);
  const ok = await runTool("book_delivery_slot", { order_id: "HB-1046", slot_id: free.slot_id }, c);
  assert.equal(ok.ok, true);
  assert.equal(c.customer.orders[1].slot, free.time);
  const out = await runTool("book_delivery_slot", { order_id: "HB-1045", slot_id: free.slot_id }, c);
  assert.match(out.error, /no longer be changed/);
  const bad = await runTool("book_delivery_slot", { order_id: "HB-1046", slot_id: "2027-01-01_S1" }, c);
  assert.ok(bad.error);
  const full = slots.find((s) => s.note === "full");
  if (full) assert.ok((await runTool("book_delivery_slot", { order_id: "HB-1046", slot_id: full.slot_id }, c)).error);
});

test("skip respects the 10 PM cut-off", async () => {
  const c = ctx();
  assert.equal((await runTool("skip_subscription_delivery", { date: "2026-10-06" }, c)).ok, true);
  assert.match((await runTool("skip_subscription_delivery", { date: "2026-10-06" }, c)).error, /Nothing to skip/);
  const late = ctx(new Date("2026-10-05T17:00:00Z")); // 10:30 PM IST
  assert.match((await runTool("skip_subscription_delivery", { date: "2026-10-06" }, late)).error, /Too late/);
  assert.equal((await runTool("skip_subscription_delivery", { date: "2026-10-07" }, late)).ok, true);
});

test("pause, view schedule, resume", async () => {
  const c = ctx();
  const p = await runTool("pause_subscription", { start_date: "2026-10-08", end_date: "2026-10-10" }, c);
  assert.equal(p.days, 3);
  const sub = await runTool("get_subscription", {}, c);
  assert.equal(sub.next_7_days.find((d) => d.date === "2026-10-09").status, "paused");
  assert.equal(sub.next_7_days.find((d) => d.date === "2026-10-06").status, "scheduled");
  assert.match((await runTool("pause_subscription", { start_date: "2026-10-08", end_date: "2026-12-30" }, c)).error, /at most 30/);
  assert.match((await runTool("pause_subscription", { start_date: "2026-10-05", end_date: "2026-10-06" }, c)).error, /Too late/);
  const r = await runTool("resume_subscription", {}, c);
  assert.equal(r.changes_removed, 1);
  assert.equal(c.customer.subscription.pauses.length, 0);
});

test("curd only on Mon/Wed/Fri", async () => {
  const sub = await runTool("get_subscription", {}, ctx());
  const tue = sub.next_7_days.find((d) => d.date === "2026-10-06");
  const wed = sub.next_7_days.find((d) => d.date === "2026-10-07");
  assert.equal(tue.items.length, 1);
  assert.equal(wed.items.length, 2);
});
