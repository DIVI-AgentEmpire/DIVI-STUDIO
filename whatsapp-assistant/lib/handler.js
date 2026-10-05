// Core webhook logic, kept separate from the Vercel entry point so it can be tested.

import { runAgent } from "./agent.js";
import { newCustomer } from "./data.js";
import { detectLanguage, fixed } from "./language.js";
import { markRead, sendText } from "./whatsapp.js";

const CUSTOMER_TTL = 30 * 24 * 3600; // forget demo customers after 30 days
const BACK_TO_BOT = /^\s*(bot|menu|assistant|ಬಾಟ್|ಮೆನು)\s*[.!]*\s*$/i;
const RESET = /^\s*reset demo\s*$/i;

const log = (...a) => console.log("[wa]", ...a);

export async function loadCustomer(store, phone, name, now) {
  const c = await store.get(`customer:${phone}`);
  if (c) {
    if (name && c.name === "Demo customer") c.name = name;
    return c;
  }
  return newCustomer(phone, name, now);
}

const saveCustomer = (store, c) => store.set(`customer:${c.phone}`, c, CUSTOMER_TTL);

/** deps: { cfg, store, fetchImpl, now } */
export async function handleMessage(msg, deps) {
  const { cfg, store, fetchImpl = fetch } = deps;
  const now = deps.now || new Date();
  const send = (to, text) => sendText(cfg, to, text, fetchImpl);

  // Meta can deliver the same message more than once; process each ID only once.
  if (!(await store.setIfAbsent(`seen:${msg.id}`, 24 * 3600))) return log("duplicate", msg.id);

  const text = (msg.text || "").trim();

  // Owner commands from the business owner's own WhatsApp: /reply, /done, /help.
  if (cfg.ownerNumber && msg.from === cfg.ownerNumber && text.startsWith("/")) {
    return handleOwnerCommand(text, deps, send);
  }

  markRead(cfg, msg.id, fetchImpl).catch(() => {});
  const customer = await loadCustomer(store, msg.from, msg.name, now);
  const lang = text ? detectLanguage(text) : "en";

  if (RESET.test(text)) {
    const fresh = newCustomer(msg.from, customer.name, now);
    await saveCustomer(store, fresh);
    return send(msg.from, fixed("reset", "en"));
  }

  // While a human is handling this chat, the bot stays quiet and forwards messages.
  const h = customer.handover;
  if (h.active && h.until && new Date(h.until) < now) Object.assign(h, { active: false, until: null, reason: null });
  if (h.active) {
    if (BACK_TO_BOT.test(text)) {
      Object.assign(h, { active: false, until: null, reason: null });
      await saveCustomer(store, customer);
      return send(msg.from, fixed("backToBot", lang));
    }
    await notifyOwner(cfg, send, `💬 ${customer.name} (+${msg.from}): ${text || `[${msg.type}]`}\nReply: /reply ${msg.from} <message>`);
    return saveCustomer(store, customer);
  }

  if (!text) return send(msg.from, fixed("unsupported", lang));

  const startHandover = async (reason, summary) => {
    Object.assign(h, { active: true, reason, until: new Date(now.getTime() + cfg.handoverMinutes * 60_000).toISOString() });
    await notifyOwner(cfg, send,
      `🙋 Handover: ${customer.name} (+${msg.from})\nReason: ${reason}\nSummary: ${summary}\nLast message: "${text}"\n\nReply: /reply ${msg.from} <message>\nGive back to bot: /done ${msg.from}`);
  };

  let reply;
  try {
    ({ reply } = await runAgent({ cfg, customer, text, lang, now, fetchImpl, startHandover }));
  } catch (err) {
    log("agent error:", err.message);
    if (!h.active) await startHandover("assistant error", `Bot failed: ${err.message.slice(0, 120)}`).catch(() => {});
    reply = fixed("error", lang);
  }
  await saveCustomer(store, customer);
  await send(msg.from, reply);
}

async function notifyOwner(cfg, send, text) {
  if (!cfg.ownerNumber) return log("OWNER_WHATSAPP_NUMBER not set; handover note:", text);
  try {
    await send(cfg.ownerNumber, text);
  } catch (err) {
    // Usually: owner hasn't messaged the test number in the last 24 h, or isn't a verified recipient.
    log("could not notify owner:", err.message);
  }
}

async function handleOwnerCommand(text, { cfg, store, now = new Date() }, send) {
  const [cmd, phone, ...rest] = text.split(/\s+/);
  const target = (phone || "").replace(/\D/g, "");
  const owner = cfg.ownerNumber;
  if (cmd === "/reply" && target && rest.length) {
    const c = await store.get(`customer:${target}`);
    if (!c) return send(owner, `No demo customer +${target}.`);
    c.handover = { active: true, reason: c.handover.reason || "owner replied", until: new Date(now.getTime() + cfg.handoverMinutes * 60_000).toISOString() };
    c.history.push({ role: "assistant", content: `[Team member]: ${rest.join(" ")}` });
    await saveCustomer(store, c);
    await send(target, rest.join(" "));
    return send(owner, `✅ Sent to +${target}.`);
  }
  if (cmd === "/done" && target) {
    const c = await store.get(`customer:${target}`);
    if (!c) return send(owner, `No demo customer +${target}.`);
    c.handover = { active: false, until: null, reason: null };
    await saveCustomer(store, c);
    await send(target, fixed("backToBot", "en"));
    return send(owner, `✅ +${target} is back with the bot.`);
  }
  return send(owner, "Owner commands:\n/reply <number> <message> – reply to a customer\n/done <number> – hand the chat back to the bot");
}
