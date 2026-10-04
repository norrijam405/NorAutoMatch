import {
  motiveAskAiAdapterEvidence,
  normalizeMotiveAskAiEvent,
  requireAuthorizedProviderContract,
} from "../src/lib/conversation-provider-adapter";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

assert(motiveAskAiAdapterEvidence.contractState === "UNVERIFIED", "Motive Ask AI adapter must remain unverified before provider contract evidence exists.");
assert(motiveAskAiAdapterEvidence.authorizationRef === null, "Motive adapter must not invent an authorization reference.");
assert(motiveAskAiAdapterEvidence.sourceContractRef === null, "Motive adapter must not invent a source contract reference.");

let unverifiedRejected = false;
try {
  normalizeMotiveAskAiEvent({ synthetic: true });
} catch (error) {
  unverifiedRejected = error instanceof Error && error.message === "PROVIDER_ADAPTER_CONTRACT_NOT_VERIFIED";
}
assert(unverifiedRejected, "Motive provider payload must not be normalized before its authorized event contract is verified.");

requireAuthorizedProviderContract({
  provider: "synthetic-provider",
  adapterVersion: "1.0.0-test",
  contractState: "VERIFIED_AUTHORIZED_CONTRACT",
  authorizationRef: "synthetic-business-approval:test-only",
  sourceContractRef: "synthetic-provider-contract:test-only",
});

let missingApprovalRejected = false;
try {
  requireAuthorizedProviderContract({
    provider: "synthetic-provider",
    adapterVersion: "1.0.0-test",
    contractState: "VERIFIED_AUTHORIZED_CONTRACT",
    authorizationRef: null,
    sourceContractRef: "synthetic-provider-contract:test-only",
  });
} catch (error) {
  missingApprovalRejected = error instanceof Error && error.message === "PROVIDER_ADAPTER_AUTHORIZATION_NOT_EVIDENCED";
}
assert(missingApprovalRejected, "Verified-contract label without authorization evidence must fail closed.");

console.log("PASS_CONVERSATION_PROVIDER_ADAPTER_AUTHORIZATION_BOUNDARY");
