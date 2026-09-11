import assert from "node:assert/strict";
import { readJsonBodyWithByteLimit } from "../src/lib/request-body-limit";

function chunkedRequest(chunks: Uint8Array[], headers: Record<string, string> = {}) {
  let index = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close();
        return;
      }
      controller.enqueue(chunks[index]);
      index += 1;
    },
  });
  return new Request("https://example.invalid/intake", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: stream,
    duplex: "half",
  } as RequestInit & { duplex: "half" });
}

async function main() {
  const encoder = new TextEncoder();

  const exact = encoder.encode(JSON.stringify({ value: "123456" }));
  const exactResult = await readJsonBodyWithByteLimit(
    new Request("https://example.invalid/intake", {
      method: "POST",
      body: exact,
      headers: { "content-type": "application/json" },
    }),
    exact.byteLength,
  );
  assert.equal(exactResult.ok, true, "body exactly at byte limit must be accepted");
  if (exactResult.ok) assert.equal(exactResult.byteLength, exact.byteLength);

  const tooLarge = encoder.encode(JSON.stringify({ value: "1234567" }));
  const declaredTooLarge = await readJsonBodyWithByteLimit(
    new Request("https://example.invalid/intake", {
      method: "POST",
      body: tooLarge,
      headers: {
        "content-type": "application/json",
        "content-length": String(tooLarge.byteLength),
      },
    }),
    exact.byteLength,
  );
  assert.deepEqual(declaredTooLarge, { ok: false, reason: "TOO_LARGE" });

  const spoofedSmallLength = await readJsonBodyWithByteLimit(
    chunkedRequest([tooLarge.subarray(0, 5), tooLarge.subarray(5)], { "content-length": "1" }),
    exact.byteLength,
  );
  assert.deepEqual(
    spoofedSmallLength,
    { ok: false, reason: "TOO_LARGE" },
    "actual bytes must defeat spoofed Content-Length",
  );

  const chunkedOversize = await readJsonBodyWithByteLimit(
    chunkedRequest([encoder.encode('{"value":"'), encoder.encode("x".repeat(64)), encoder.encode('"}')]),
    32,
  );
  assert.deepEqual(chunkedOversize, { ok: false, reason: "TOO_LARGE" });

  const malformedUtf8 = await readJsonBodyWithByteLimit(
    chunkedRequest([new Uint8Array([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d])]),
    64,
  );
  assert.deepEqual(malformedUtf8, { ok: false, reason: "INVALID_JSON" });

  const malformedJson = await readJsonBodyWithByteLimit(
    new Request("https://example.invalid/intake", {
      method: "POST",
      body: "{not-json",
      headers: { "content-type": "application/json" },
    }),
    64,
  );
  assert.deepEqual(malformedJson, { ok: false, reason: "INVALID_JSON" });

  await assert.rejects(
    () => readJsonBodyWithByteLimit(new Request("https://example.invalid"), 0),
    /REQUEST_BODY_LIMIT_INVALID_MAX_BYTES/,
  );

  console.log("request body byte-limit behavior: PASS");
}

void main();
