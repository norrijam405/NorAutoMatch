export type WorkspaceActionClass =
  | "EXTERNAL_SEND"
  | "REAL_CRM_WRITE"
  | "SECONDARY_CRM_COPY"
  | "MODEL_PROVIDER_USE"
  | "TOOL_NETWORK_USE"
  | "TERMINAL_CRM_OUTCOME"
  | "COMPLAINT_RESOLUTION"
  | "FINANCING_COMMITMENT";

export type WorkspaceAuthorityState = "ACTIVE" | "REVOKED" | "EXPIRED" | "UNKNOWN";

export type WorkspaceActionPolicy = {
  workspaceId: string;
  authorityState: WorkspaceAuthorityState;
  autonomousSendAllowed: boolean;
  realCrmWriteAllowed: boolean;
  secondaryCrmCopyAllowed: boolean;
  eligibleModelProviders: string[];
  allowedToolClasses: string[];
  allowedNetworkDestinations: string[];
  terminalOutcomeAuthorities: Array<"MANAGER" | "DEALERSHIP_SYSTEM">;
  humanApprovalRequiredFor: WorkspaceActionClass[];
  humanApprovalPresentFor: WorkspaceActionClass[];
};

export type WorkspaceActionRequest = {
  workspaceId: string;
  actionClass: WorkspaceActionClass;
  actor: "NORAUTO_SYSTEM" | "MANAGER" | "DEALERSHIP_SYSTEM";
  modelProvider?: string;
  toolClass?: string;
  networkDestination?: string;
};

export type WorkspaceActionDecision = {
  protocol: "NORAUTO_WORKSPACE_ACTION_DECISION_V1";
  state: "ALLOW_BOUNDED" | "BLOCK" | "ESCALATE_HUMAN";
  reasons: string[];
  authorityEffect: "NONE";
};

function normalized(values: string[]) {
  return new Set(values.map((value) => value.trim().toLowerCase()).filter(Boolean));
}

export function evaluateWorkspaceAction(input: {
  policy: WorkspaceActionPolicy;
  request: WorkspaceActionRequest;
}): WorkspaceActionDecision {
  const { policy, request } = input;
  if (!policy.workspaceId.trim() || !request.workspaceId.trim()) {
    throw new Error("Workspace policy evaluation requires explicit workspace identity.");
  }
  if (policy.workspaceId !== request.workspaceId) {
    return {
      protocol: "NORAUTO_WORKSPACE_ACTION_DECISION_V1",
      state: "BLOCK",
      reasons: ["WORKSPACE_MISMATCH"],
      authorityEffect: "NONE",
    };
  }

  if (policy.authorityState !== "ACTIVE") {
    return {
      protocol: "NORAUTO_WORKSPACE_ACTION_DECISION_V1",
      state: "BLOCK",
      reasons: [`AUTHORITY_${policy.authorityState}`],
      authorityEffect: "NONE",
    };
  }

  const approvalRequired = policy.humanApprovalRequiredFor.includes(request.actionClass);
  const approvalPresent = policy.humanApprovalPresentFor.includes(request.actionClass);
  if (approvalRequired && !approvalPresent) {
    return {
      protocol: "NORAUTO_WORKSPACE_ACTION_DECISION_V1",
      state: "ESCALATE_HUMAN",
      reasons: ["HUMAN_APPROVAL_REQUIRED"],
      authorityEffect: "NONE",
    };
  }

  const block = (reason: string): WorkspaceActionDecision => ({
    protocol: "NORAUTO_WORKSPACE_ACTION_DECISION_V1",
    state: "BLOCK",
    reasons: [reason],
    authorityEffect: "NONE",
  });

  switch (request.actionClass) {
    case "EXTERNAL_SEND":
      return policy.autonomousSendAllowed
        ? { protocol: "NORAUTO_WORKSPACE_ACTION_DECISION_V1", state: "ALLOW_BOUNDED", reasons: ["SEND_AUTHORIZED_BY_POLICY"], authorityEffect: "NONE" }
        : block("AUTONOMOUS_SEND_NOT_AUTHORIZED");
    case "REAL_CRM_WRITE":
      return policy.realCrmWriteAllowed
        ? { protocol: "NORAUTO_WORKSPACE_ACTION_DECISION_V1", state: "ALLOW_BOUNDED", reasons: ["CRM_WRITE_AUTHORIZED_BY_POLICY"], authorityEffect: "NONE" }
        : block("REAL_CRM_WRITE_NOT_AUTHORIZED");
    case "SECONDARY_CRM_COPY":
      return policy.secondaryCrmCopyAllowed
        ? { protocol: "NORAUTO_WORKSPACE_ACTION_DECISION_V1", state: "ALLOW_BOUNDED", reasons: ["SECONDARY_COPY_AUTHORIZED_BY_POLICY"], authorityEffect: "NONE" }
        : block("SECONDARY_CRM_COPY_NOT_AUTHORIZED");
    case "MODEL_PROVIDER_USE": {
      if (!request.modelProvider?.trim()) return block("MODEL_PROVIDER_IDENTITY_REQUIRED");
      return normalized(policy.eligibleModelProviders).has(request.modelProvider.trim().toLowerCase())
        ? { protocol: "NORAUTO_WORKSPACE_ACTION_DECISION_V1", state: "ALLOW_BOUNDED", reasons: ["MODEL_PROVIDER_ALREADY_QUALIFIED_AND_ALLOWED"], authorityEffect: "NONE" }
        : block("MODEL_PROVIDER_NOT_QUALIFIED_OR_ALLOWED");
    }
    case "TOOL_NETWORK_USE": {
      if (!request.toolClass?.trim()) return block("TOOL_CLASS_REQUIRED");
      if (!request.networkDestination?.trim()) return block("NETWORK_DESTINATION_REQUIRED");
      const tools = normalized(policy.allowedToolClasses);
      const destinations = normalized(policy.allowedNetworkDestinations);
      if (!tools.has(request.toolClass.trim().toLowerCase())) return block("TOOL_CLASS_NOT_ALLOWED");
      if (!destinations.has(request.networkDestination.trim().toLowerCase())) return block("NETWORK_DESTINATION_NOT_ALLOWED");
      return { protocol: "NORAUTO_WORKSPACE_ACTION_DECISION_V1", state: "ALLOW_BOUNDED", reasons: ["TOOL_AND_NETWORK_ALREADY_ALLOWED"], authorityEffect: "NONE" };
    }
    case "TERMINAL_CRM_OUTCOME": {
      if (request.actor === "NORAUTO_SYSTEM") return block("SYSTEM_CANNOT_SELF_AUTHORIZE_TERMINAL_CRM_OUTCOME");
      const authority = request.actor === "MANAGER" ? "MANAGER" : "DEALERSHIP_SYSTEM";
      return policy.terminalOutcomeAuthorities.includes(authority)
        ? { protocol: "NORAUTO_WORKSPACE_ACTION_DECISION_V1", state: "ALLOW_BOUNDED", reasons: ["TERMINAL_OUTCOME_ACTOR_AUTHORIZED"], authorityEffect: "NONE" }
        : block("TERMINAL_OUTCOME_ACTOR_NOT_AUTHORIZED");
    }
    case "COMPLAINT_RESOLUTION":
    case "FINANCING_COMMITMENT":
      return {
        protocol: "NORAUTO_WORKSPACE_ACTION_DECISION_V1",
        state: "ESCALATE_HUMAN",
        reasons: ["CONSEQUENTIAL_HUMAN_AUTHORITY_REQUIRED"],
        authorityEffect: "NONE",
      };
  }
}
