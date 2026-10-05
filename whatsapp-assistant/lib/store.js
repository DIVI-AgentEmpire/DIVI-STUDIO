// Key-value storage. Uses Upstash Redis (free tier) when configured, otherwise process memory.
// Memory works for quick demos but resets whenever Vercel starts a fresh function instance.

const PREFIX = "hasiru-demo:";

export function memoryStore() {
  const m = new Map();
  const alive = (k) => {
    const e = m.get(k);
    if (e && e.exp && e.exp < Date.now()) m.delete(k);
    return m.get(k);
  };
  return {
    kind: "memory",
    async get(k) { return alive(PREFIX + k)?.v ?? null; },
    async set(k, v, ttlSec) { m.set(PREFIX + k, { v: structuredClone(v), exp: ttlSec ? Date.now() + ttlSec * 1000 : 0 }); },
    async setIfAbsent(k, ttlSec) {
      if (alive(PREFIX + k)) return false;
      m.set(PREFIX + k, { v: 1, exp: Date.now() + ttlSec * 1000 });
      return true;
    },
  };
}

export function redisStore(url, token, fetchImpl = fetch) {
  const cmd = async (...args) => {
    const r = await fetchImpl(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    if (!r.ok) throw new Error(`Redis ${args[0]} failed: HTTP ${r.status}`);
    return (await r.json()).result;
  };
  return {
    kind: "redis",
    async get(k) { const v = await cmd("GET", PREFIX + k); return v == null ? null : JSON.parse(v); },
    async set(k, v, ttlSec) { await cmd("SET", PREFIX + k, JSON.stringify(v), ...(ttlSec ? ["EX", ttlSec] : [])); },
    async setIfAbsent(k, ttlSec) { return (await cmd("SET", PREFIX + k, "1", "NX", "EX", ttlSec)) === "OK"; },
  };
}

let shared;
export function getStore(cfg) {
  if (!shared) shared = cfg.redisUrl && cfg.redisToken ? redisStore(cfg.redisUrl, cfg.redisToken) : memoryStore();
  return shared;
}
