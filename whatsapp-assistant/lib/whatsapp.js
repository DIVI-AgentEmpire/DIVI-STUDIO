// Thin wrapper around the WhatsApp Cloud API (Graph API).

import crypto from "node:crypto";

export function verifySignature(rawBody, header, appSecret) {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", appSecret).update(rawBody, "utf8").digest("hex");
  const got = header.slice(7);
  return got.length === expected.length && crypto.timingSafeEqual(Buffer.from(got), Buffer.from(expected));
}

// Flatten a webhook payload into the incoming messages we care about.
export function extractMessages(payload) {
  const out = [];
  for (const entry of payload?.entry || []) {
    for (const change of entry.changes || []) {
      const v = change.value || {};
      const names = Object.fromEntries((v.contacts || []).map((c) => [c.wa_id, c.profile?.name]));
      for (const m of v.messages || []) {
        const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title ?? m.interactive?.list_reply?.title ?? null;
        out.push({ id: m.id, from: m.from, name: names[m.from] || "", type: m.type, text });
      }
    }
  }
  return out;
}

async function graph(cfg, body, fetchImpl) {
  const url = `https://graph.facebook.com/${cfg.graphVersion}/${cfg.waPhoneNumberId}/messages`;
  const r = await fetchImpl(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.waToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  });
  if (!r.ok) {
    const detail = await r.text().catch(() => "");
    throw new Error(`WhatsApp API HTTP ${r.status}: ${detail.slice(0, 300)}`);
  }
  return r.json();
}

export function sendText(cfg, to, text, fetchImpl = fetch) {
  return graph(cfg, { recipient_type: "individual", to, type: "text", text: { preview_url: false, body: text.slice(0, 4000) } }, fetchImpl);
}

export function markRead(cfg, messageId, fetchImpl = fetch) {
  return graph(cfg, { status: "read", message_id: messageId }, fetchImpl);
}
