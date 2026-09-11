import assert from "node:assert/strict";
import {
  MemoryPublicAbuseCounterStore,
  evaluatePublicAbuse,
  extractPublicNetworkSubject,
  hashPublicAbuseSubject,
  PUBLIC_LEAD_ABUSE_LIMIT,
  PUBLIC_LEAD_ABUSE_WINDOW_SECONDS,
} from "../src/lib/public-abuse-control";

const secret = "0123456789abcdef0123456789abcdef";

assert.throws(
  () => hashPublicAbuseSubject("203.0.113.10", "too-short"),
  /at least 32 characters/,
  "weak public-abuse HMAC secrets must fail closed",
);

const hashA = hashPublicAbuseSubject("203.0.113.10", secret);
const hashARepeat = hashPublicAbuseSubject("203.0.113.10", secret);
const hashB = hashPublicAbuseSubject("203.0.113.11", secret);
assert.match(hashA, /^[0-9a-f]{64}$/);
assert.equal(hashA, hashARepeat, "same subject and secret must hash deterministically");
assert.notEqual(hashA, hashB, "different network subjects must not collapse to one hash");
assert.equal(hashA.includes("203.0.113.10"), false, "stored subject identifiers must not echo raw network values");

assert.equal(
  extractPublicNetworkSubject(new Request("https://example.test", {
    headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
  })),
  "203.0.113.10",
  "the first forwarded network subject must be used",
);
assert.equal(
  extractPublicNetworkSubject(new Request("https://example.test", {
    headers: { "x-real-ip": "198.51.100.7" },
  })),
  "198.51.100.7",
  "x-real-ip must be a bounded fallback when forwarded context is absent",
);
assert.equal(
  extractPublicNetworkSubject(new Request("https://example.test")),
  "unknown",
  "missing network context must collapse to a bounded shared subject instead of bypassing control",
);

const store = new MemoryPublicAbuseCounterStore();
const start = new Date("2026-09-11T22:00:00.000Z");
for (let count = 1; count <= PUBLIC_LEAD_ABUSE_LIMIT; count += 1) {
  const decision = await evaluatePublicAbuse({
    store,
    networkSubject: "203.0.113.10",
    hmacSecret: secret,
    now: new Date(start.getTime() + count * 1000),
  });
  assert.equal(decision.allowed, true, `request ${count} inside the bounded window must remain allowed`);
  assert.equal(decision.count, count);
}

const limited = await evaluatePublicAbuse({
  store,
  networkSubject: "203.0.113.10",
  hmacSecret: secret,
  now: new Date(start.getTime() + 6000),
});
assert.equal(limited.allowed, false, "the request immediately beyond the configured budget must be limited");
assert.equal(limited.remaining, 0);

const independentSubject = await evaluatePublicAbuse({
  store,
  networkSubject: "203.0.113.11",
  hmacSecret: secret,
  now: new Date(start.getTime() + 7000),
});
assert.equal(independentSubject.allowed, true, "separate pseudonymous subjects must receive separate distributed budgets");
assert.equal(independentSubject.count, 1);

const reset = await evaluatePublicAbuse({
  store,
  networkSubject: "203.0.113.10",
  hmacSecret: secret,
  now: new Date(start.getTime() + (PUBLIC_LEAD_ABUSE_WINDOW_SECONDS + 2) * 1000),
});
assert.equal(reset.allowed, true, "an expired fixed window must reset to a new bounded budget");
assert.equal(reset.count, 1);

const failingStore = {
  async consume() {
    throw new Error("synthetic distributed store outage");
  },
};
await assert.rejects(
  evaluatePublicAbuse({
    store: failingStore,
    networkSubject: "203.0.113.12",
    hmacSecret: secret,
    now: start,
  }),
  /synthetic distributed store outage/,
  "distributed-store failures must propagate so production callers can fail closed",
);

console.log("public abuse control behavior: PASS");
