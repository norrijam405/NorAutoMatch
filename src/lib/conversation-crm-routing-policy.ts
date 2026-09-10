export type SecondaryCrmMode = "NONE" | "REFERENCE_ONLY" | "FULL_COPY";

export type ConversationCrmRoutingPolicy = {
  protocol: "IGNIAQUA_CRM_ROUTING_POLICY_V1";
  workspaceId: string;
  primary: {
    destination: string;
    mode: "FULL_COPY";
  };
  secondary: {
    destination: string | null;
    mode: SecondaryCrmMode;
    businessApprovalRef: string | null;
  };
  minimumNecessaryData: true;
  authorityEffect: "NONE";
};

export type CrmRoutingPlan = {
  protocol: "IGNIAQUA_CRM_ROUTING_PLAN_V1";
  workspaceId: string;
  destinations: Array<{
    destination: string;
    mode: "REFERENCE_ONLY" | "FULL_COPY";
  }>;
  authorityEffect: "NONE";
};

function bounded(value: string, label: string, max = 160) {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) throw new Error(`${label} is invalid.`);
  return normalized;
}

export function buildCrmRoutingPlan(policy: ConversationCrmRoutingPolicy): CrmRoutingPlan {
  if (policy.protocol !== "IGNIAQUA_CRM_ROUTING_POLICY_V1") throw new Error("CRM routing policy protocol drifted.");
  const workspaceId = bounded(policy.workspaceId, "Workspace", 128);
  const primary = bounded(policy.primary.destination, "Primary CRM destination");

  if (policy.minimumNecessaryData !== true || policy.authorityEffect !== "NONE") {
    throw new Error("CRM routing policy must preserve data-minimization and authority boundaries.");
  }

  const destinations: CrmRoutingPlan["destinations"] = [{ destination: primary, mode: "FULL_COPY" }];
  if (policy.secondary.mode === "NONE") {
    if (policy.secondary.destination !== null || policy.secondary.businessApprovalRef !== null) {
      throw new Error("Disabled secondary CRM routing must not carry a destination or approval reference.");
    }
  } else {
    const secondary = bounded(policy.secondary.destination ?? "", "Secondary CRM destination");
    const approvalRef = bounded(policy.secondary.businessApprovalRef ?? "", "Secondary CRM business approval", 512);
    if (secondary === primary) throw new Error("Secondary CRM destination must be distinct from primary CRM.");
    if (!approvalRef) throw new Error("Secondary CRM routing requires explicit business approval evidence.");
    destinations.push({ destination: secondary, mode: policy.secondary.mode });
  }

  return {
    protocol: "IGNIAQUA_CRM_ROUTING_PLAN_V1",
    workspaceId,
    destinations,
    authorityEffect: "NONE",
  };
}
