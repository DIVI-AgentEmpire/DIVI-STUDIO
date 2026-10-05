import test from "node:test";
import assert from "node:assert/strict";
import { memoryStore, redisStore } from "../lib/store.js";

test("memory store: get/set/setIfAbsent", async () => {
  const s = memoryStore();
  assert.equal(await s.get("a"), null);
  await s.set("a", { x: 1 });
  assert.deepEqual(await s.get("a"), { x: 1 });
  assert.equal(await s.setIfAbsent("k", 60), true);
  assert.equal(await s.setIfAbsent("k", 60), false);
});

test("redis store sends Upstash REST commands", async () => {
  const calls = [];
  const data = new Map();
  const fakeFetch = async (url, init) => {
    const cmd = JSON.parse(init.body);
    calls.push({ url, auth: init.headers.Authorization, cmd });
    let result = null;
    if (cmd[0] === "GET") result = data.get(cmd[1]) ?? null;
    if (cmd[0] === "SET") {
      if (cmd.includes("NX") && data.has(cmd[1])) result = null;
      else { data.set(cmd[1], cmd[2]); result = "OK"; }
    }
    return new Response(JSON.stringify({ result }), { status: 200 });
  };
  const s = redisStore("https://up.example", "tok", fakeFetch);
  await s.set("c", { n: 2 }, 100);
  assert.deepEqual(await s.get("c"), { n: 2 });
  assert.equal(await s.setIfAbsent("seen", 10), true);
  assert.equal(await s.setIfAbsent("seen", 10), false);
  assert.equal(calls[0].auth, "Bearer tok");
  assert.deepEqual(calls[0].cmd.slice(-2), ["EX", 100]);
});

test("health endpoint never leaks values", async () => {
  process.env.GROQ_API_KEY = "gsk_secret_value";
  const { GET } = await import("../api/health.js");
  const text = await GET().text();
  assert.ok(!text.includes("gsk_secret_value"));
  assert.match(text, /"GROQ_API_KEY":true/);
  delete process.env.GROQ_API_KEY;
});
