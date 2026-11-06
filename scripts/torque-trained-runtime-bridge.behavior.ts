import assert from "node:assert/strict";
import { prepareTorqueRuntimeDraft, TORQUE_RUNTIME_REQUEST_PROTOCOL, TORQUE_RUNTIME_RESPONSE_PROTOCOL } from "../src/lib/torque-trained-runtime-bridge";
import type { ResponsePreparationPacket } from "../src/lib/conversation-response-preparation";

async function run() {
  const packet = {
    protocol: "NORAUTO_RESPONSE_PREPARATION_PACKET_V1",
    authorityEffect: "DRAFT_PREPARATION_ONLY",
    outboundExecution: "NOT_PERFORMED",
    customerReachedState: "NOT_CLAIMED",
    responseState: "HUMAN_REVIEW_DUE",
    conversationId: "conv-synthetic",
    eventId: "event-synthetic",
    customerStated: {
      questions: ["Is the Rogue available?"],
      constraints: ["AWD required"],
      subjectRefs: ["VIN-SYNTHETIC"],
      summary: null,
    },
    evidenceRequirements: [{ topic: "AVAILABILITY" }, { topic: "PRICE" }],
  } as ResponsePreparationPacket;

  const missing = await prepareTorqueRuntimeDraft({ packet });
  assert.equal(missing.state, "UNAVAILABLE");
  if (missing.state === "UNAVAILABLE") assert.equal(missing.reason, "NOT_CONFIGURED");

  const invalid = await prepareTorqueRuntimeDraft({
    packet, endpoint: "http://127.0.0.1/private", approvedOrigin: "http://127.0.0.1", bearerToken: "synthetic",
  });
  assert.equal(invalid.state, "UNAVAILABLE");
  if (invalid.state === "UNAVAILABLE") assert.equal(invalid.reason, "INVALID_ENDPOINT");

  let calls = 0;
  const settings = {
    packet, endpoint: "https://torque.example.test/draft", approvedOrigin: "https://torque.example.test", bearerToken: "synthetic", approvedForExternalRuntime: true,
  };
  const valid = await prepareTorqueRuntimeDraft({
    ...settings,
    transport: async (_url, init) => {
      calls++;
      assert.equal(init.method, "POST");
      const request = JSON.parse(String(init.body));
      assert.equal(request.protocol, TORQUE_RUNTIME_REQUEST_PROTOCOL);
      assert.equal(request.requestedAuthority, "DRAFT_ONLY");
      assert.equal(request.context.questions[0], "Is the Rogue available?");
      assert.equal("customer" in request, false);
      return new Response(JSON.stringify({
        protocol: TORQUE_RUNTIME_RESPONSE_PROTOCOL,
        draft: "I can help verify the Rogue listing with the dealership.",
        evidenceNeeded: ["AVAILABILITY"],
      }), { status: 200 });
    },
  });
  assert.equal(calls, 1);
  assert.equal(valid.state, "DRAFT_ONLY");
  assert.equal(valid.outboundExecution, "NOT_PERFORMED");
  assert.equal(valid.customerReachedState, "NOT_CLAIMED");
  assert.equal(valid.authorityEffect, "NONE");
  if (valid.state === "DRAFT_ONLY") assert.equal(valid.review.state, "REVIEW_REQUIRED");

  const noApproval = await prepareTorqueRuntimeDraft({
    ...settings, approvedForExternalRuntime: false,
    transport: async () => { throw new Error("must not send customer text without approval"); },
  });
  assert.equal(noApproval.state, "UNAVAILABLE");
  if (noApproval.state === "UNAVAILABLE") assert.equal(noApproval.reason, "CONTEXT_BLOCKED");

  const sensitive = await prepareTorqueRuntimeDraft({
    ...settings,
    packet: { ...packet, customerStated: { ...packet.customerStated, summary: "Call me at 405-555-1234." } },
    transport: async () => { throw new Error("must not leak phone number"); },
  });
  assert.equal(sensitive.state, "UNAVAILABLE");
  if (sensitive.state === "UNAVAILABLE") assert.equal(sensitive.reason, "CONTEXT_BLOCKED");

  const badResponse = await prepareTorqueRuntimeDraft({
    ...settings,
    transport: async () => new Response(JSON.stringify({
      protocol: TORQUE_RUNTIME_RESPONSE_PROTOCOL, draft: "Okay", evidenceNeeded: [],
      customerReachedState: "DELIVERED",
    }), { status: 200 }),
  });
  assert.equal(badResponse.state, "UNAVAILABLE");
  if (badResponse.state === "UNAVAILABLE") assert.equal(badResponse.reason, "INVALID_RESPONSE");

  const deniedRedirect = await prepareTorqueRuntimeDraft({
    ...settings,
    transport: async (_url, init) => {
      assert.equal(init.redirect, "error");
      throw new Error("redirect blocked");
    },
  });
  assert.equal(deniedRedirect.state, "UNAVAILABLE");
  const blockedRoute = await prepareTorqueRuntimeDraft({
    ...settings, packet: { ...packet, responseState: "NO_RESPONSE_ROUTE" },
    transport: async () => { throw new Error("must not call transport"); },
  });
  assert.equal(blockedRoute.state, "UNAVAILABLE");
  if (blockedRoute.state === "UNAVAILABLE") assert.equal(blockedRoute.reason, "INVALID_PACKET");
  process.stdout.write("Torque trained runtime bridge synthetic behavior PASS\n");
}

run().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
