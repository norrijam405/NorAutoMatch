import assert from "node:assert/strict";
import { evaluateInstructionPrecedence } from "../src/lib/authority-precedence";
import { decideCrmRelayRetry } from "../src/lib/crm-relay-retry-policy";
import { evaluateWorkspaceAction, type WorkspaceActionPolicy } from "../src/lib/workspace-policy-runtime";

const basePolicy: WorkspaceActionPolicy = {
  workspaceId: "dealer-a",
  authorityState: "ACTIVE",
  autonomousSendAllowed: false,
  realCrmWriteAllowed: false,
  secondaryCrmCopyAllowed: false,
  eligibleModelProviders: ["qualified-provider"],
  allowedToolClasses: ["inventory-read"],
  allowedNetworkDestinations: ["api.example.invalid"],
  terminalOutcomeAuthorities: ["MANAGER", "DEALERSHIP_SYSTEM"],
  humanApprovalRequiredFor: ["COMPLAINT_RESOLUTION", "FINANCING_COMMITMENT"],
  humanApprovalPresentFor: [],
};

function decision(policy: WorkspaceActionPolicy, request: Parameters<typeof evaluateWorkspaceAction>[0]["request"]) {
  return evaluateWorkspaceAction({ policy, request });
}

const results: Array<{ challenge: string; state: string; passed: boolean }> = [];
function pass(challenge: string, state: string) {
  results.push({ challenge, state, passed: true });
}

// Cross-workspace attack: one dealership must never inherit another dealership's permission.
{
  const result = decision(basePolicy, {
    workspaceId: "dealer-b",
    actionClass: "EXTERNAL_SEND",
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(result.state, "BLOCK");
  assert.ok(result.reasons.includes("WORKSPACE_MISMATCH"));
  pass("cross_workspace_isolation", result.state);
}

// Revoked, expired, and unknown permission states all fail closed.
for (const authorityState of ["REVOKED", "EXPIRED", "UNKNOWN"] as const) {
  const result = decision({ ...basePolicy, authorityState }, {
    workspaceId: "dealer-a",
    actionClass: "EXTERNAL_SEND",
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(result.state, "BLOCK");
  assert.ok(result.reasons.includes(`AUTHORITY_${authorityState}`));
  pass(`authority_${authorityState.toLowerCase()}_blocks`, result.state);
}

// The system cannot quietly grant itself outbound or CRM powers.
for (const actionClass of ["EXTERNAL_SEND", "REAL_CRM_WRITE", "SECONDARY_CRM_COPY"] as const) {
  const result = decision(basePolicy, {
    workspaceId: "dealer-a",
    actionClass,
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(result.state, "BLOCK");
  pass(`${actionClass.toLowerCase()}_not_self_authorized`, result.state);
}

// A provider that has not already been qualified cannot be used as fallback.
{
  const result = decision(basePolicy, {
    workspaceId: "dealer-a",
    actionClass: "MODEL_PROVIDER_USE",
    actor: "NORAUTO_SYSTEM",
    modelProvider: "random-fallback-provider",
  });
  assert.equal(result.state, "BLOCK");
  assert.ok(result.reasons.includes("MODEL_PROVIDER_NOT_QUALIFIED_OR_ALLOWED"));
  pass("unqualified_provider_blocked", result.state);
}

// An unapproved tool or network destination cannot be used.
{
  const badTool = decision(basePolicy, {
    workspaceId: "dealer-a",
    actionClass: "TOOL_NETWORK_USE",
    actor: "NORAUTO_SYSTEM",
    toolClass: "shell-execution",
    networkDestination: "api.example.invalid",
  });
  assert.equal(badTool.state, "BLOCK");
  assert.ok(badTool.reasons.includes("TOOL_CLASS_NOT_ALLOWED"));
  pass("unapproved_tool_blocked", badTool.state);

  const badNetwork = decision(basePolicy, {
    workspaceId: "dealer-a",
    actionClass: "TOOL_NETWORK_USE",
    actor: "NORAUTO_SYSTEM",
    toolClass: "inventory-read",
    networkDestination: "evil.example.invalid",
  });
  assert.equal(badNetwork.state, "BLOCK");
  assert.ok(badNetwork.reasons.includes("NETWORK_DESTINATION_NOT_ALLOWED"));
  pass("unapproved_network_blocked", badNetwork.state);
}

// The AI cannot mark the real sales result by itself.
{
  const result = decision(basePolicy, {
    workspaceId: "dealer-a",
    actionClass: "TERMINAL_CRM_OUTCOME",
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(result.state, "BLOCK");
  assert.ok(result.reasons.includes("SYSTEM_CANNOT_SELF_AUTHORIZE_TERMINAL_CRM_OUTCOME"));
  pass("system_cannot_self_mark_terminal_outcome", result.state);
}

// Consequential complaint and financing actions remain human decisions.
for (const actionClass of ["COMPLAINT_RESOLUTION", "FINANCING_COMMITMENT"] as const) {
  const result = decision(basePolicy, {
    workspaceId: "dealer-a",
    actionClass,
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(result.state, "ESCALATE_HUMAN");
  pass(`${actionClass.toLowerCase()}_requires_human`, result.state);
}

// Lower-authority instructions cannot weaken a higher-authority boundary.
{
  const result = evaluateInstructionPrecedence({
    controllingAuthority: "WORKSPACE_POLICY",
    proposedAuthority: "AGENT",
    wouldRelaxControllingBoundary: true,
  });
  assert.equal(result.state, "REJECT_LOWER_AUTHORITY_OVERRIDE");
  pass("lower_authority_override_rejected", result.state);
}

// Retry pressure is bounded: after the approved number of attempts, work is parked.
{
  assert.deepEqual(decideCrmRelayRetry({ attempt: 1, maxAttempts: 3 }), {
    state: "RETRY_SCHEDULED",
    delayMs: 5_000,
  });
  assert.deepEqual(decideCrmRelayRetry({ attempt: 2, maxAttempts: 3 }), {
    state: "RETRY_SCHEDULED",
    delayMs: 10_000,
  });
  const terminal = decideCrmRelayRetry({ attempt: 3, maxAttempts: 3 });
  assert.deepEqual(terminal, { state: "PARKED", delayMs: null });
  pass("retry_exhaustion_parks_work", terminal.state);
}

// Mutation challenge: flip a normally-safe permission to true and prove only that bounded action changes.
{
  const mutatedPolicy = { ...basePolicy, autonomousSendAllowed: true };
  const send = decision(mutatedPolicy, {
    workspaceId: "dealer-a",
    actionClass: "EXTERNAL_SEND",
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(send.state, "ALLOW_BOUNDED");

  const terminal = decision(mutatedPolicy, {
    workspaceId: "dealer-a",
    actionClass: "TERMINAL_CRM_OUTCOME",
    actor: "NORAUTO_SYSTEM",
  });
  assert.equal(terminal.state, "BLOCK");
  pass("permission_mutation_does_not_expand_unrelated_authority", `${send.state}/${terminal.state}`);
}

assert.equal(results.every((result) => result.passed), true);

console.log(JSON.stringify({
  protocol: "NORAUTOMATCH_PAIRED_CHALLENGE_CAMPAIGN_V1",
  truthState: "SYNTHETIC_CHALLENGE_PASS",
  authorityEffect: "NONE",
  challengeCount: results.length,
  results,
  nonClaims: {
    productionDeployed: false,
    liveCustomerTrafficTested: false,
    realCrmWriteTested: false,
    autonomousSendActivated: false,
    proposedContainmentLawActivated: false,
  },
}, null, 2));
