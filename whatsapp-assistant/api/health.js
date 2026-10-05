// https://<your-project>.vercel.app/api/health – shows which settings are present (never their values).

import { getConfig } from "../lib/config.js";

export function GET() {
  const c = getConfig();
  const checks = {
    GROQ_API_KEY: Boolean(c.groqApiKey),
    WHATSAPP_TOKEN: Boolean(c.waToken),
    WHATSAPP_PHONE_NUMBER_ID: Boolean(c.waPhoneNumberId),
    WHATSAPP_VERIFY_TOKEN: Boolean(c.waVerifyToken),
    WHATSAPP_APP_SECRET: Boolean(c.waAppSecret),
    OWNER_WHATSAPP_NUMBER: Boolean(c.ownerNumber),
  };
  const required = ["GROQ_API_KEY", "WHATSAPP_TOKEN", "WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_VERIFY_TOKEN"];
  return Response.json({
    ready: required.every((k) => checks[k]),
    settings: checks,
    model: c.groqModel,
    storage: c.redisUrl && c.redisToken ? "upstash-redis" : "memory (resets on cold start)",
  });
}
