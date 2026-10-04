import { buildCrmRoutingPlan, type ConversationCrmRoutingPolicy } from "../src/lib/conversation-crm-routing-policy";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const primaryOnly: ConversationCrmRoutingPolicy = {
  protocol: "IGNIAQUA_CRM_ROUTING_POLICY_V1",
  workspaceId: "norautomatch",
  primary: { destination: "dealership-crm", mode: "FULL_COPY" },
  secondary: { destination: null, mode: "NONE", businessApprovalRef: null },
  minimumNecessaryData: true,
  authorityEffect: "NONE",
};
const primaryPlan = buildCrmRoutingPlan(primaryOnly);
assert(primaryPlan.destinations.length === 1, "Primary-only policy must produce exactly one destination.");
assert(primaryPlan.destinations[0]?.destination === "dealership-crm", "Primary dealership CRM must remain first destination.");

const referenceOnly = buildCrmRoutingPlan({
  ...primaryOnly,
  secondary: {
    destination: "operator-crm",
    mode: "REFERENCE_ONLY",
    businessApprovalRef: "gsm-approval:synthetic-policy-001",
  },
});
assert(referenceOnly.destinations.length === 2, "Approved secondary CRM reference route should be represented.");
assert(referenceOnly.destinations[1]?.mode === "REFERENCE_ONLY", "Reference-only policy must not silently become a full customer-data copy.");

const fullCopy = buildCrmRoutingPlan({
  ...primaryOnly,
  secondary: {
    destination: "approved-secondary-crm",
    mode: "FULL_COPY",
    businessApprovalRef: "owner-approval:synthetic-policy-002",
  },
});
assert(fullCopy.destinations[1]?.mode === "FULL_COPY", "Explicitly approved full-copy route must preserve its declared mode.");

let noApprovalRejected = false;
try {
  buildCrmRoutingPlan({
    ...primaryOnly,
    secondary: { destination: "operator-crm", mode: "FULL_COPY", businessApprovalRef: null },
  });
} catch {
  noApprovalRejected = true;
}
assert(noApprovalRejected, "Secondary full-copy routing without business approval evidence must fail closed.");

let dirtyDisabledRouteRejected = false;
try {
  buildCrmRoutingPlan({
    ...primaryOnly,
    secondary: { destination: "operator-crm", mode: "NONE", businessApprovalRef: null },
  });
} catch {
  dirtyDisabledRouteRejected = true;
}
assert(dirtyDisabledRouteRejected, "Disabled secondary routing must not retain a destination.");

let authorityDriftRejected = false;
try {
  buildCrmRoutingPlan({ ...primaryOnly, authorityEffect: "WRITE_CUSTOMER_DATA" as "NONE" });
} catch {
  authorityDriftRejected = true;
}
assert(authorityDriftRejected, "CRM routing policy must never manufacture authority.");

console.log("PASS_CONVERSATION_CRM_ROUTING_POLICY_BOUNDARY");
