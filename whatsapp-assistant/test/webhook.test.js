import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { detectLanguage } from "../lib/language.js";
import { handleMessage } from "../lib/handler.js";
import { extractMessages, verifySignature } from "../lib/whatsapp.js";
import { GET, POST } from "../api/webhook.js";
import { cfg, deps, fakeNet, msg, say, toolCall } from "./helpers.js";

test("language detection", () => {
  assert.equal(detectLanguage("What is the price of milk?"), "en");
  assert.equal(detectLanguage("ನಾಳೆ ಹಾಲು ಬೇಡ"), "kn");
  assert.equal(detectLanguage("naale haalu beda"), "kn-latn");
  assert.equal(detectLanguage("nanna order yelli ide"), "kn-latn");
  assert.equal(detectLanguage("Where is my order?"), "en");
  assert.equal(detectLanguage("Hi"), "en");
});

test("webhook verification handshake", async () => {
  process.env.WHATSAPP_VERIFY_TOKEN = "verify-me";
  const ok = GET(new Request("https://x/api/webhook?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=42"));
  assert.equal(ok.status, 200);
  assert.equal(await ok.text(), "42");
  assert.equal(GET(new Request("https://x/api/webhook?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=42")).status, 403);
});

test("POST rejects bad signatures when app secret is set", async () => {
  process.env.WHATSAPP_APP_SECRET = "shh";
  const body = JSON.stringify({ entry: [] });
  const bad = await POST(new Request("https://x/api/webhook", { method: "POST", body, headers: { "x-hub-signature-256": "sha256=00" } }));
  assert.equal(bad.status, 401);
  const sig = "sha256=" + crypto.createHmac("sha256", "shh").update(body).digest("hex");
  const good = await POST(new Request("https://x/api/webhook", { method: "POST", body, headers: { "x-hub-signature-256": sig } }));
  assert.equal(good.status, 200);
  assert.equal(verifySignature(body, sig, "shh"), true);
  delete process.env.WHATSAPP_APP_SECRET;
});

test("extractMessages reads text and names; ignores statuses", () => {
  const payload = { entry: [{ changes: [{ value: {
    contacts: [{ wa_id: "9198", profile: { name: "Asha" } }],
    messages: [{ id: "m1", from: "9198", type: "text", text: { body: "hi" } }],
    statuses: [{ id: "s1", status: "delivered" }],
  } }] }] };
  assert.deepEqual(extractMessages(payload), [{ id: "m1", from: "9198", name: "Asha", type: "text", text: "hi" }]);
});

test("agent uses a tool then replies; language instruction is sent; duplicates ignored", async () => {
  const net = fakeNet([toolCall("search_products", { query: "milk" }), say("*Toned milk 500 ml* is ₹27.")]);
  const d = deps(net);
  const m = msg("ಹಾಲು ಬೆಲೆ ಎಷ್ಟು?");
  await handleMessage(m, d);
  await handleMessage(m, d); // duplicate delivery
  assert.equal(net.sent.length, 1);
  assert.equal(net.sent[0].text, "*Toned milk 500 ml* is ₹27.");
  assert.match(net.groqRequests[0].messages[0].content, /Kannada script/);
  const toolMsg = net.groqRequests[1].messages.find((x) => x.role === "tool");
  assert.match(toolMsg.content, /"price_inr":27/);
  assert.equal(net.groqRequests[0].reasoning_effort, "low");
});

test("state persists between messages (skip is remembered)", async () => {
  const net = fakeNet([toolCall("skip_subscription_delivery", { date: "2026-10-06" }), say("Skipped."), toolCall("get_subscription", {}), say("ok")]);
  const d = deps(net);
  await handleMessage(msg("skip tomorrow", "91981"), d);
  await handleMessage(msg("show my subscription", "91981"), d);
  const toolResult = JSON.parse(net.groqRequests[3].messages.find((x) => x.role === "tool").content);
  assert.equal(toolResult.next_7_days[0].status, "skipped");
  // conversation history was carried into the second turn
  assert.ok(net.groqRequests[2].messages.some((x) => x.role === "assistant" && x.content === "Skipped."));
});

test("handover: owner notified, bot goes quiet and forwards, owner can reply, BOT returns", async () => {
  const net = fakeNet([toolCall("handover_to_human", { reason: "damaged item", summary: "Eggs broken in HB-1045" }), say("Sorry! Our team will reply here soon. Type BOT to come back.")]);
  const d = deps(net);
  const customer = "91982";
  await handleMessage(msg("my eggs came broken!!", customer), d);
  const ownerAlert = net.sent.find((s) => s.to === cfg.ownerNumber);
  assert.match(ownerAlert.text, /Handover/);
  assert.match(ownerAlert.text, /damaged item/);

  await handleMessage(msg("hello??", customer), d);
  assert.equal(net.sent.filter((s) => s.to === customer).length, 1); // no bot reply while handed over
  assert.match(net.sent.at(-1).text, /hello\?\?/); // forwarded to owner
  assert.equal(net.groqRequests.length, 2); // AI not called again

  await handleMessage(msg("/reply 91982 Sorry, refund done!", cfg.ownerNumber), d);
  assert.ok(net.sent.some((s) => s.to === customer && s.text === "Sorry, refund done!"));

  await handleMessage(msg("bot", customer), d);
  assert.match(net.sent.find((s) => s.to === customer && /back with/.test(s.text)).text, /assistant/);
});

test("AI failure falls back to a polite message and alerts the owner", async () => {
  const net = fakeNet([]); // Groq returns 429
  const d = deps(net);
  await handleMessage(msg("naale haalu beda", "91983"), d);
  const toCustomer = net.sent.find((s) => s.to === "91983");
  assert.match(toCustomer.text, /Sorry, eega/); // Kanglish fallback
  assert.ok(net.sent.some((s) => s.to === cfg.ownerNumber && /assistant error/.test(s.text)));
});

test("reset demo and unsupported media", async () => {
  const net = fakeNet([]);
  const d = deps(net);
  await handleMessage(msg("reset demo", "91984"), d);
  assert.match(net.sent[0].text, /reset/);
  await handleMessage({ id: "img1", from: "91984", name: "", type: "image", text: null }, d);
  assert.match(net.sent[1].text, /text messages only/);
});
