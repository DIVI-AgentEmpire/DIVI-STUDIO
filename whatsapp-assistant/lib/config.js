// All secrets come from environment variables; nothing sensitive lives in the code.

export function getConfig(env = process.env) {
  const digits = (v) => (v || "").replace(/\D/g, "");
  return {
    groqApiKey: env.GROQ_API_KEY || "",
    groqModel: env.GROQ_MODEL || "openai/gpt-oss-120b",
    waToken: env.WHATSAPP_TOKEN || "",
    waPhoneNumberId: env.WHATSAPP_PHONE_NUMBER_ID || "",
    waVerifyToken: env.WHATSAPP_VERIFY_TOKEN || "",
    waAppSecret: env.WHATSAPP_APP_SECRET || "",
    graphVersion: env.GRAPH_API_VERSION || "v23.0",
    ownerNumber: digits(env.OWNER_WHATSAPP_NUMBER),
    handoverMinutes: Number(env.HANDOVER_MINUTES) || 60,
    redisUrl: env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || "",
    redisToken: env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || "",
  };
}
