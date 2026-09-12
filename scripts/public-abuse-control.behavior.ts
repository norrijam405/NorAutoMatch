import assert from "node:assert/strict";
import {
  MemoryPublicAbuseCounterStore,
  evaluatePublicAbuse,
  extractPublicNetworkSubject,
  hashPublicAbuseSubject,
  parsePublicNetworkSubjectHeader,
  PUBLIC_LEAD_ABUSE_LIMIT,
  PUBLIC_LEAD_ABUSE_WINDOW_SECONDS,
  TRUSTED_PROXY_NETWORK_HEADERS_ACTIVATION,
} from "../src/lib/public-abuse-control";

const secret = "0123456789abcdef0123456789abcdef";
const rotatedSecret = "abcdef0123456789abcdef0123456789";

async function main() {
  assert.equal(TRUSTED_PROXY_NETWORK_HEADERS_ACTIVATION, "TRUST_DEPLOYMENT_PROXY_NETWORK_HEADERS");
  assert.equal(parsePublicNetworkSubjectHeader("x-forwarded-for"), "x-forwarded-for");
  assert.equal(parsePublicNetworkSubjectHeader(" X-Real-IP "), "x-real-ip");
  assert.equal(parsePublicNetworkSubjectHeader("cf-connecting-ip"), null, "unreviewed network headers must not be trusted implicitly");
  assert.equal(parsePublicNetworkSubjectHeader(undefined), null);

  assert.throws(
    () => hashPublicAbuseSubject("203.0.113.10", "too-short"),
    /at least 32 characters/,
    "weak public-abuse HMAC secrets must fail closed",
  );
  assert.throws(
    () => hashPublicAbuseSubject("   ", secret),
    /network subject is required/,
    "missing network subjects must not collapse into a shared production identity",
  );

  const hashA = hashPublicAbuseSubject("203.0.113.10", secret);
  const hashARepeat = hashPublicAbuseSubject("203.0.113.10", secret);
  const hashB = hashPublicAbuseSubject("203.0.113.11", secret);
  assert.match(hashA, /^[0-9a-f]{64}$/);
  assert.equal(hashA, hashARepeat, "same subject and secret must hash deterministically");
  assert.notEqual(hashA, hashB, "different network subjects must not collapse to one hash");
  assert.equal(hashA.includes("203.0.113.10"), false, "stored subject identifiers must not echo raw network values");

  const bothHeaders = new Request("https://example.test", {
    headers: {
      "x-forwarded-for": "203.0.113.10, 10.0.0.1",
      "x-real-ip": "198.51.100.7",
    },
  });
  assert.equal(
    extractPublicNetworkSubject(bothHeaders, "x-forwarded-for"),
    "203.0.113.10",
    "only the explicitly selected forwarded header may define the network subject",
  );
  assert.equal(
    extractPublicNetworkSubject(bothHeaders, "x-real-ip"),
    "198.51.100.7",
    "only the explicitly selected real-ip header may define the network subject",
  );
  assert.equal(
    extractPublicNetworkSubject(new Request("https://example.test"), "x-forwarded-for"),
    null,
    "missing trusted ingress context must fail closed instead of sharing one global unknown bucket",
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

  const rotationStore = new MemoryPublicAbuseCounterStore();
  const rotationSubject = "203.0.113.44";
  for (let count = 1; count <= PUBLIC_LEAD_ABUSE_LIMIT; count += 1) {
    const beforeRotation = await evaluatePublicAbuse({
      store: rotationStore,
      networkSubject: rotationSubject,
      hmacSecret: secret,
      now: new Date(start.getTime() + count * 1000),
    });
    assert.equal(beforeRotation.allowed, true);
  }
  const duringRotation = await evaluatePublicAbuse({
    store: rotationStore,
    networkSubject: rotationSubject,
    hmacSecret: rotatedSecret,
    previousHmacSecret: secret,
    now: new Date(start.getTime() + 6000),
  });
  assert.equal(duringRotation.allowed, false, "HMAC rotation must not reset an active abuse budget");
  assert.equal(duringRotation.count, PUBLIC_LEAD_ABUSE_LIMIT + 1, "the stricter previous-key counter must govern during rollover");

  await assert.rejects(
    evaluatePublicAbuse({
      store: rotationStore,
      networkSubject: rotationSubject,
      hmacSecret: rotatedSecret,
      previousHmacSecret: rotatedSecret,
      now: new Date(start.getTime() + 7000),
    }),
    /must differ from the current secret/,
    "duplicate current/previous abuse keys must fail closed",
  );
  await assert.rejects(
    evaluatePublicAbuse({
      store: rotationStore,
      networkSubject: rotationSubject,
      hmacSecret: rotatedSecret,
      previousHmacSecret: "short",
      now: new Date(start.getTime() + 7000),
    }),
    /at least 32 characters/,
    "weak previous abuse key must fail closed",
  );

  const afterOldWindow = await evaluatePublicAbuse({
    store: rotationStore,
    networkSubject: rotationSubject,
    hmacSecret: rotatedSecret,
    previousHmacSecret: secret,
    now: new Date(start.getTime() + (PUBLIC_LEAD_ABUSE_WINDOW_SECONDS + 10) * 1000),
  });
  assert.equal(afterOldWindow.allowed, true, "after the full prior window expires, rollover counters may begin a fresh bounded window");

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

  console.log("PASS_PUBLIC_ABUSE_CONTROL_WITH_HMAC_ROLLOVER_CONTINUITY");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
