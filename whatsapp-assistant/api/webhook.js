// Vercel serverless function: https://<your-project>.vercel.app/api/webhook

import { getConfig } from "../lib/config.js";
import { handleMessage } from "../lib/handler.js";
import { getStore } from "../lib/store.js";
import { extractMessages, verifySignature } from "../lib/whatsapp.js";

// Meta calls this once when you click "Verify and save" in the webhook settings.
export function GET(request) {
  const cfg = getConfig();
  const p = new URL(request.url).searchParams;
  if (p.get("hub.mode") === "subscribe" && cfg.waVerifyToken && p.get("hub.verify_token") === cfg.waVerifyToken) {
    return new Response(p.get("hub.challenge") || "", { status: 200 });
  }
  return new Response("Forbidden", { status: 403 });
}

// Meta calls this for every incoming message and status update.
export async function POST(request) {
  const cfg = getConfig();
  const raw = await request.text();

  if (cfg.waAppSecret) {
    if (!verifySignature(raw, request.headers.get("x-hub-signature-256"), cfg.waAppSecret)) {
      return new Response("Invalid signature", { status: 401 });
    }
  } else {
    console.warn("[wa] WHATSAPP_APP_SECRET not set: webhook signatures are NOT checked");
  }

  let payload;
  try { payload = JSON.parse(raw); } catch { return new Response("Bad JSON", { status: 400 }); }

  const deps = { cfg, store: getStore(cfg) };
  for (const msg of extractMessages(payload)) {
    try {
      await handleMessage(msg, deps);
    } catch (err) {
      console.error("[wa] failed to handle message", msg.id, err);
    }
  }
  // Always 200 so Meta doesn't keep retrying; errors are logged above.
  return new Response("OK", { status: 200 });
}
