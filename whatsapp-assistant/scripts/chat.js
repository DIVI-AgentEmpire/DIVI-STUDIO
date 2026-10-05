// Chat with the assistant in your terminal; no WhatsApp or Meta setup needed, only GROQ_API_KEY.
// Usage: npm run chat        (reads .env if present)
// Type "/owner ..." to act as the shop owner, e.g. "/owner /reply 919900000001 Hi, checking now".

import fs from "node:fs";
import readline from "node:readline/promises";
import { getConfig } from "../lib/config.js";
import { handleMessage } from "../lib/handler.js";
import { memoryStore } from "../lib/store.js";

if (fs.existsSync(".env")) {
  for (const line of fs.readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const CUSTOMER = "919900000001";
const OWNER = "919900000099";
const cfg = { ...getConfig(), ownerNumber: OWNER, waPhoneNumberId: "local", waToken: "local" };
if (!cfg.groqApiKey) {
  console.error("Set GROQ_API_KEY in .env first (get one free at https://console.groq.com/keys).");
  process.exit(1);
}

// Pretend to be WhatsApp: print outgoing messages instead of sending them.
const fakeFetch = async (url, init) => {
  if (String(url).includes("graph.facebook.com")) {
    const body = JSON.parse(init.body);
    if (body.type === "text") {
      const who = body.to === OWNER ? "\x1b[35m[to owner]\x1b[0m" : "\x1b[32mHasiru:\x1b[0m";
      console.log(`\n${who} ${body.text.body}\n`);
    }
    return new Response(JSON.stringify({ messages: [{ id: "local" }] }), { status: 200 });
  }
  return fetch(url, init);
};

const store = memoryStore();
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
console.log(`Hasiru Basket demo (${cfg.groqModel}). Try: "milk price", "where is my order", "ನಾಳೆ ಹಾಲು ಬೇಡ", "naale haalu beda", "I want to talk to a person". Ctrl+C to quit.\n`);
let n = 0;
for (;;) {
  const line = (await rl.question("\x1b[36mYou:\x1b[0m ")).trim();
  if (!line) continue;
  const asOwner = line.startsWith("/owner ");
  const msg = { id: `local-${++n}`, from: asOwner ? OWNER : CUSTOMER, name: "Demo user", type: "text", text: asOwner ? line.slice(7) : line };
  await handleMessage(msg, { cfg, store, fetchImpl: fakeFetch });
}
