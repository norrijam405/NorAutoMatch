import {
  authorizeMachineServiceAssertion,
  createMachineServiceAssertionForTrustedIssuer,
  type MachineServiceAssertionClaims,
} from "../src/lib/machine-service-auth";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const secret = "machine-service-current-secret-at-least-32-characters";
const previousSecret = "machine-service-previous-secret-at-least-32-characters";
const now = 1_789_000_000;
const claims: MachineServiceAssertionClaims = {
  protocol: "NORAUTO_MACHINE_ASSERTION_V1",
  issuerService: "conversation-provider-adapter",
  audience: "CONVERSATION_GATEWAY",
  workspaceId: "norautomatch",
  issuedAt: now - 5,
  expiresAt: now + 120,
  nonce: "machine-assertion-nonce-0001",
};

const token = createMachineServiceAssertionForTrustedIssuer({ claims, configuredSecret: secret });
const valid = authorizeMachineServiceAssertion({
  authorizationHeader: `Bearer ${token}`,
  configuredSecret: secret,
  expectedAudience: "CONVERSATION_GATEWAY",
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(valid.authorized, "Valid scoped machine assertion must authorize before replay consumption.");
assert(valid.claims.issuerService === claims.issuerService, "Authorized assertion must preserve issuer service identity.");

const oldToken = createMachineServiceAssertionForTrustedIssuer({
  claims: { ...claims, nonce: "machine-assertion-old-key-0001" },
  configuredSecret: previousSecret,
});
const rolloverAccepted = authorizeMachineServiceAssertion({
  authorizationHeader: `Bearer ${oldToken}`,
  configuredSecret: secret,
  configuredPreviousSecret: previousSecret,
  expectedAudience: "CONVERSATION_GATEWAY",
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(rolloverAccepted.authorized, "Previous machine signing key must verify only during an explicit rollover window.");

const retiredOldKey = authorizeMachineServiceAssertion({
  authorizationHeader: `Bearer ${oldToken}`,
  configuredSecret: secret,
  expectedAudience: "CONVERSATION_GATEWAY",
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!retiredOldKey.authorized && retiredOldKey.reason === "INVALID_SIGNATURE", "Old machine key must stop authorizing immediately after previous-key removal.");

const duplicateKeyConfig = authorizeMachineServiceAssertion({
  authorizationHeader: `Bearer ${token}`,
  configuredSecret: secret,
  configuredPreviousSecret: secret,
  expectedAudience: "CONVERSATION_GATEWAY",
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!duplicateKeyConfig.authorized && duplicateKeyConfig.reason === "NOT_CONFIGURED", "Current and previous machine signing keys must not be identical.");

const weakPreviousConfig = authorizeMachineServiceAssertion({
  authorizationHeader: `Bearer ${token}`,
  configuredSecret: secret,
  configuredPreviousSecret: "short",
  expectedAudience: "CONVERSATION_GATEWAY",
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!weakPreviousConfig.authorized && weakPreviousConfig.reason === "NOT_CONFIGURED", "Malformed previous machine signing key must fail closed even when the current key is valid.");

const weakConfig = authorizeMachineServiceAssertion({
  authorizationHeader: `Bearer ${token}`,
  configuredSecret: "short",
  expectedAudience: "CONVERSATION_GATEWAY",
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!weakConfig.authorized && weakConfig.reason === "NOT_CONFIGURED", "Weak assertion secret must fail closed.");

const missing = authorizeMachineServiceAssertion({
  authorizationHeader: null,
  configuredSecret: secret,
  expectedAudience: "CONVERSATION_GATEWAY",
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!missing.authorized && missing.reason === "MISSING_TOKEN", "Missing assertion must fail closed.");

const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
const badSignature = authorizeMachineServiceAssertion({
  authorizationHeader: `Bearer ${tampered}`,
  configuredSecret: secret,
  expectedAudience: "CONVERSATION_GATEWAY",
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!badSignature.authorized && badSignature.reason === "INVALID_SIGNATURE", "Tampered assertion must fail signature verification.");

const wrongAudience = authorizeMachineServiceAssertion({
  authorizationHeader: `Bearer ${token}`,
  configuredSecret: secret,
  expectedAudience: "CRM_RELAY",
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!wrongAudience.authorized && wrongAudience.reason === "WRONG_AUDIENCE", "Conversation assertion must not authenticate to CRM relay.");

const wrongWorkspace = authorizeMachineServiceAssertion({
  authorizationHeader: `Bearer ${token}`,
  configuredSecret: secret,
  expectedAudience: "CONVERSATION_GATEWAY",
  expectedWorkspaceId: "other-workspace",
  nowEpochSeconds: now,
});
assert(!wrongWorkspace.authorized && wrongWorkspace.reason === "WRONG_WORKSPACE", "Machine assertion must not cross workspace boundaries.");

const expiredToken = createMachineServiceAssertionForTrustedIssuer({
  configuredSecret: secret,
  claims: { ...claims, issuedAt: now - 200, expiresAt: now - 60, nonce: "machine-assertion-expired-0001" },
});
const expired = authorizeMachineServiceAssertion({
  authorizationHeader: `Bearer ${expiredToken}`,
  configuredSecret: secret,
  expectedAudience: "CONVERSATION_GATEWAY",
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!expired.authorized && expired.reason === "EXPIRED", "Expired machine assertion must fail closed.");

const futureToken = createMachineServiceAssertionForTrustedIssuer({
  configuredSecret: secret,
  claims: { ...claims, issuedAt: now + 120, expiresAt: now + 240, nonce: "machine-assertion-future-0001" },
});
const future = authorizeMachineServiceAssertion({
  authorizationHeader: `Bearer ${futureToken}`,
  configuredSecret: secret,
  expectedAudience: "CONVERSATION_GATEWAY",
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!future.authorized && future.reason === "EXPIRED", "Materially future-issued machine assertion must fail closed.");

let overlongRejected = false;
try {
  createMachineServiceAssertionForTrustedIssuer({
    configuredSecret: secret,
    claims: { ...claims, issuedAt: now, expiresAt: now + 301, nonce: "machine-assertion-overlong-01" },
  });
} catch {
  overlongRejected = true;
}
assert(overlongRejected, "Trusted issuer helper must refuse assertions longer than five minutes.");

console.log("PASS_MACHINE_SERVICE_ASSERTION_BOUNDARY_WITH_BOUNDED_ROLLOVER");
