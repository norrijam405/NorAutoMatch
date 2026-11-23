import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHouseHandshakeHandler } from "../src/lib/house-app-handshake-r0.ts";

const SECRET = "synthetic-norautomatch-house-secret-32-bytes";
const NOW = Date.now();
const SCHEMA = "igniaqua.house.app-handshake.v1";

function hmac(secret: string, message: string): string {
  return crypto.createHmac("sha256", secret).update(message, "utf8").digest("hex");
}

function signedRequest(
  secret = SECRET,
  nonce = "ab".repeat(16),
  timestamp = Math.floor(NOW / 1000),
  overrides: Record<string, unknown> = {}
): Request {
  const input: Record<string, unknown> = {
    schema: SCHEMA,
    kind: "request",
    sender: "IGNIAQUA_CONTROL_PANEL",
    recipient: "norautomatch",
    timestamp,
    nonce,
    ...overrides
  };
  input.signature = hmac(secret, [
    SCHEMA,
    "request",
    "IGNIAQUA_CONTROL_PANEL",
    "norautomatch",
    String(input.timestamp),
    String(input.nonce)
  ].join("\n"));
  return new Request("http://localhost/api/house/v1/handshake", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify(input)
  });
}

function expectedResponseSignature(
  secret: string,
  response: Record<string, unknown>,
  replayProtection: "PROCESS_LOCAL" | "DURABLE" = "PROCESS_LOCAL"
): string {
  const canonicalCapabilities = JSON.stringify(response.capabilities);
  const digest = crypto.createHash("sha256").update(canonicalCapabilities, "utf8").digest("hex");
  const message = [
    SCHEMA,
    "response",
    "norautomatch",
    "IGNIAQUA_CONTROL_PANEL",
    String(response.timestamp),
    String(response.nonce),
    "READ_ONLY_HEARTBEAT",
    "false",
    replayProtection,
    digest
  ].join("\n");
  return hmac(secret, message);
}

test("valid House v1 challenge returns an exact signed read-only identity response", async () => {
  const handler = createHouseHandshakeHandler({
    env: { IGNIAQUA_NORAUTOMATCH_CONTROL_PANEL_SECRET: SECRET },
    now: () => NOW
  });
  const response = await handler(signedRequest());
  assert.equal(response.status, 200);
  const body = await response.json() as Record<string, unknown>;
  assert.deepEqual(Object.keys(body).sort(), [
    "schema", "kind", "sender", "recipient", "timestamp", "nonce",
    "scope", "writes_authorized", "replay_protection", "capabilities", "signature"
  ].sort());
  assert.equal(body.schema, SCHEMA);
  assert.equal(body.kind, "response");
  assert.equal(body.sender, "norautomatch");
  assert.equal(body.recipient, "IGNIAQUA_CONTROL_PANEL");
  assert.equal(body.scope, "READ_ONLY_HEARTBEAT");
  assert.equal(body.writes_authorized, false);
  assert.equal(body.replay_protection, "PROCESS_LOCAL");
  assert.deepEqual(body.capabilities, []);
  assert.equal(body.signature, expectedResponseSignature(SECRET, body));
});

test("replayed nonce is denied within one process and accepted after a process restart", async () => {
  const options = {
    env: { IGNIAQUA_NORAUTOMATCH_CONTROL_PANEL_SECRET: SECRET },
    now: () => NOW
  };
  const firstProcess = createHouseHandshakeHandler(options);
  const challenge = signedRequest();
  assert.equal((await firstProcess(challenge)).status, 200);
  const replay = await firstProcess(signedRequest());
  assert.equal(replay.status, 409);
  assert.equal((await replay.json()).error, "HOUSE_HANDSHAKE_REPLAY_DENIED");

  const restartedProcess = createHouseHandshakeHandler(options);
  assert.equal((await restartedProcess(signedRequest())).status, 200);
});

test("file-backed replay rejects a nonce after handler recreation and stores only its hash", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "norautomatch-house-replay-"));
  const nonce = "cd".repeat(16);
  try {
    const options = {
      env: {
        IGNIAQUA_NORAUTOMATCH_CONTROL_PANEL_SECRET: SECRET,
        IGNIAQUA_NORAUTOMATCH_HOUSE_REPLAY_DIR: root
      },
      now: () => NOW
    };
    const firstProcess = createHouseHandshakeHandler(options);
    const accepted = await firstProcess(signedRequest(SECRET, nonce));
    assert.equal(accepted.status, 200);
    const acceptedBody = await accepted.json() as Record<string, unknown>;
    assert.equal(acceptedBody.replay_protection, "DURABLE");
    assert.equal(acceptedBody.signature, expectedResponseSignature(SECRET, acceptedBody, "DURABLE"));

    const files = fs.readdirSync(root);
    assert.equal(files.length, 1);
    assert.match(files[0], /^nonce-[a-f0-9]{64}\.json$/);
    assert.equal(fs.readFileSync(path.join(root, files[0]), "utf8").includes(nonce), false);

    const restartedProcess = createHouseHandshakeHandler(options);
    const replay = await restartedProcess(signedRequest(SECRET, nonce));
    assert.equal(replay.status, 409);
    assert.equal((await replay.json()).error, "HOUSE_HANDSHAKE_REPLAY_DENIED");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("configured replay store failure fails closed rather than downgrading", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "norautomatch-house-replay-fail-"));
  const blocked = path.join(root, "not-a-directory");
  fs.writeFileSync(blocked, "not a directory");
  try {
    const handler = createHouseHandshakeHandler({
      env: {
        IGNIAQUA_NORAUTOMATCH_CONTROL_PANEL_SECRET: SECRET,
        IGNIAQUA_NORAUTOMATCH_HOUSE_REPLAY_DIR: blocked
      },
      now: () => NOW
    });
    const response = await handler(signedRequest(SECRET, "de".repeat(16)));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error, "HOUSE_HANDSHAKE_REPLAY_STORE_UNAVAILABLE");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test("invalid signature, audience, timestamp, method, and content type fail closed", async () => {
  const handler = createHouseHandshakeHandler({
    env: { IGNIAQUA_NORAUTOMATCH_CONTROL_PANEL_SECRET: SECRET },
    now: () => NOW
  });

  const tampered = await signedRequest();
  const tamperedBody = await tampered.json() as Record<string, unknown>;
  tamperedBody.signature = "0".repeat(64);
  assert.equal((await handler(new Request(tampered.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(tamperedBody)
  }))).status, 401);

  assert.equal((await handler(signedRequest(SECRET, "ef".repeat(16), Math.floor(NOW / 1000), {
    recipient: "another-app"
  }))).status, 403);
  assert.equal((await handler(signedRequest(SECRET, "ef".repeat(16), Math.floor(NOW / 1000) - 300))).status, 401);
  assert.equal((await handler(new Request("http://localhost/api/house/v1/handshake", { method: "GET" }))).status, 405);
  assert.equal((await handler(new Request("http://localhost/api/house/v1/handshake", {
    method: "POST",
    headers: { "content-type": "text/plain" },
    body: "{}"
  }))).status, 415);
});

test("missing, short, or reused broad credentials fail closed", async () => {
  const missing = createHouseHandshakeHandler({ env: {}, now: () => NOW });
  assert.equal((await missing(signedRequest())).status, 503);

  const short = createHouseHandshakeHandler({
    env: { IGNIAQUA_NORAUTOMATCH_CONTROL_PANEL_SECRET: "too-short" },
    now: () => NOW
  });
  assert.equal((await short(signedRequest())).status, 503);

  const reused = createHouseHandshakeHandler({
    env: {
      IGNIAQUA_NORAUTOMATCH_CONTROL_PANEL_SECRET: SECRET,
      NORAUTO_MANAGER_API_TOKEN: SECRET
    },
    now: () => NOW
  });
  assert.equal((await reused(signedRequest())).status, 503);
});

test("oversized requests are rejected before schema processing", async () => {
  const handler = createHouseHandshakeHandler({
    env: { IGNIAQUA_NORAUTOMATCH_CONTROL_PANEL_SECRET: SECRET },
    now: () => NOW
  });
  const response = await handler(new Request("http://localhost/api/house/v1/handshake", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ payload: "x".repeat(20_000) })
  }));
  assert.equal(response.status, 413);
  assert.equal((await response.json()).error, "REQUEST_TOO_LARGE");
});
