import { memoryStore } from "../lib/store.js";

// 2026-10-05 11:00 IST
export const NOW = new Date("2026-10-05T05:30:00Z");

export const cfg = {
  groqApiKey: "test-key", groqModel: "openai/gpt-oss-120b",
  waToken: "wa-token", waPhoneNumberId: "123", waVerifyToken: "verify-me", waAppSecret: "shh",
  graphVersion: "v23.0", ownerNumber: "919900000099", handoverMinutes: 60, redisUrl: "", redisToken: "",
};

// Fake fetch: records WhatsApp sends, replays scripted Groq responses.
export function fakeNet(groqScript = []) {
  const sent = [];
  const groqRequests = [];
  const fetchImpl = async (url, init) => {
    const body = JSON.parse(init.body);
    if (url.includes("graph.facebook.com")) {
      if (body.type === "text") sent.push({ to: body.to, text: body.text.body });
      return new Response("{}", { status: 200 });
    }
    if (url.includes("api.groq.com")) {
      groqRequests.push(body);
      const next = groqScript.shift();
      if (!next) return new Response("rate limited", { status: 429 });
      return new Response(JSON.stringify({ choices: [{ message: next }] }), { status: 200 });
    }
    throw new Error(`unexpected fetch ${url}`);
  };
  return { fetchImpl, sent, groqRequests };
}

export const toolCall = (name, args, id = "c1") => ({
  role: "assistant", content: null,
  tool_calls: [{ id, type: "function", function: { name, arguments: JSON.stringify(args) } }],
});
export const say = (content) => ({ role: "assistant", content });

let n = 0;
export const msg = (text, from = "919800000001") => ({ id: `wamid.${++n}`, from, name: "Test User", type: "text", text });
export const deps = (net) => ({ cfg, store: memoryStore(), fetchImpl: net.fetchImpl, now: NOW });
