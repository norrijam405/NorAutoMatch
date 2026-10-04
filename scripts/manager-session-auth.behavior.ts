import {
  authorizeManagerSession,
  createManagerSessionTokenForTrustedIssuer,
  type ManagerSessionClaims,
} from "../src/lib/manager-session-auth";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const secret = "manager-session-test-secret-32-characters-minimum";
const previousSecret = "manager-session-previous-secret-32-characters-minimum";
const now = 1_789_000_000;
const claims: ManagerSessionClaims = {
  protocol: "NORAUTO_MANAGER_SESSION_V1",
  subjectId: "manager-123",
  workspaceId: "norautomatch",
  role: "MANAGER",
  verifier: "test-identity-gateway",
  evidenceRef: "session-evidence-123",
  issuedAt: now - 10,
  expiresAt: now + 600,
  nonce: "nonce-1234567890abcdef",
};

const token = createManagerSessionTokenForTrustedIssuer({ claims, configuredSecret: secret });
const good = authorizeManagerSession({
  authorizationHeader: `Bearer ${token}`,
  configuredSecret: secret,
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(good.authorized, "Valid manager session must authorize.");
assert(good.claims.subjectId === claims.subjectId, "Authorized session must preserve subject identity.");
assert(good.actor.state === "VERIFIED", "Authorized session must create verified manager actor evidence.");
assert(good.actor.verifier === claims.verifier, "Manager actor evidence must preserve verifier identity.");
assert(good.actor.evidenceRef === claims.evidenceRef, "Manager actor evidence must preserve source evidence reference.");

const notConfigured = authorizeManagerSession({
  authorizationHeader: `Bearer ${token}`,
  configuredSecret: "short",
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!notConfigured.authorized && notConfigured.reason === "NOT_CONFIGURED", "Short or absent session secret must fail closed.");

const missing = authorizeManagerSession({
  authorizationHeader: null,
  configuredSecret: secret,
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!missing.authorized && missing.reason === "MISSING_TOKEN", "Missing manager token must be unauthorized.");

const tampered = `${token.slice(0, -1)}${token.endsWith("A") ? "B" : "A"}`;
const badSignature = authorizeManagerSession({
  authorizationHeader: `Bearer ${tampered}`,
  configuredSecret: secret,
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!badSignature.authorized && badSignature.reason === "INVALID_SIGNATURE", "Tampered token must fail signature verification.");

const wrongWorkspace = authorizeManagerSession({
  authorizationHeader: `Bearer ${token}`,
  configuredSecret: secret,
  expectedWorkspaceId: "other-workspace",
  nowEpochSeconds: now,
});
assert(!wrongWorkspace.authorized && wrongWorkspace.reason === "WRONG_WORKSPACE", "Manager session must not cross workspace boundaries.");

const revoked = authorizeManagerSession({
  authorizationHeader: `Bearer ${token}`,
  configuredSecret: secret,
  revokedNonces: claims.nonce,
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!revoked.authorized && revoked.reason === "REVOKED", "Explicitly revoked session nonce must fail closed.");

const unrelatedRevocation = authorizeManagerSession({
  authorizationHeader: `Bearer ${token}`,
  configuredSecret: secret,
  revokedNonces: "different-nonce-1234567890",
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(unrelatedRevocation.authorized, "Revoking another nonce must not invalidate an unrelated valid session.");

const previousToken = createManagerSessionTokenForTrustedIssuer({ claims: { ...claims, nonce: "previous-key-nonce-123456" }, configuredSecret: previousSecret });
const duringRotation = authorizeManagerSession({
  authorizationHeader: `Bearer ${previousToken}`,
  configuredSecret: secret,
  configuredPreviousSecret: previousSecret,
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(duringRotation.authorized, "One previous signing secret may verify sessions during bounded rollover.");

const afterRotationWindow = authorizeManagerSession({
  authorizationHeader: `Bearer ${previousToken}`,
  configuredSecret: secret,
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!afterRotationWindow.authorized && afterRotationWindow.reason === "INVALID_SIGNATURE", "Removing previous secret must immediately end old-key acceptance.");

const invalidPreviousSecret = authorizeManagerSession({
  authorizationHeader: `Bearer ${token}`,
  configuredSecret: secret,
  configuredPreviousSecret: "short",
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!invalidPreviousSecret.authorized && invalidPreviousSecret.reason === "NOT_CONFIGURED", "Malformed rollover configuration must fail closed.");

const samePreviousSecret = authorizeManagerSession({
  authorizationHeader: `Bearer ${token}`,
  configuredSecret: secret,
  configuredPreviousSecret: secret,
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!samePreviousSecret.authorized && samePreviousSecret.reason === "NOT_CONFIGURED", "Current and previous signing secrets must not be identical.");

const invalidRevocationConfig = authorizeManagerSession({
  authorizationHeader: `Bearer ${token}`,
  configuredSecret: secret,
  revokedNonces: "tiny",
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!invalidRevocationConfig.authorized && invalidRevocationConfig.reason === "NOT_CONFIGURED", "Malformed revocation configuration must fail closed.");

const expiredToken = createManagerSessionTokenForTrustedIssuer({
  configuredSecret: secret,
  claims: { ...claims, issuedAt: now - 1200, expiresAt: now - 100, nonce: "expired-nonce-123456789" },
});
const expired = authorizeManagerSession({
  authorizationHeader: `Bearer ${expiredToken}`,
  configuredSecret: secret,
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!expired.authorized && expired.reason === "EXPIRED", "Expired manager session must be rejected.");

const futureToken = createManagerSessionTokenForTrustedIssuer({
  configuredSecret: secret,
  claims: { ...claims, issuedAt: now + 120, expiresAt: now + 600, nonce: "future-nonce-1234567890" },
});
const futureIssued = authorizeManagerSession({
  authorizationHeader: `Bearer ${futureToken}`,
  configuredSecret: secret,
  expectedWorkspaceId: "norautomatch",
  nowEpochSeconds: now,
});
assert(!futureIssued.authorized && futureIssued.reason === "EXPIRED", "Materially future-issued manager session must fail closed.");

let overlongRejected = false;
try {
  createManagerSessionTokenForTrustedIssuer({
    configuredSecret: secret,
    claims: { ...claims, issuedAt: now, expiresAt: now + 7200, nonce: "overlong-nonce-123456789" },
  });
} catch {
  overlongRejected = true;
}
assert(overlongRejected, "Trusted issuer helper must refuse sessions longer than one hour.");

console.log("PASS_MANAGER_SESSION_AUTH_BOUNDARY");
