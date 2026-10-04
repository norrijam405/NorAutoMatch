export type InstructionAuthority = "CONSTITUTIONAL" | "WORKSPACE_POLICY" | "HUMAN_GRANT" | "MISSION" | "AGENT" | "CUSTOMER" | "UNTRUSTED_CONTENT";

const AUTHORITY_RANK: Record<InstructionAuthority, number> = {
  CONSTITUTIONAL: 700,
  WORKSPACE_POLICY: 600,
  HUMAN_GRANT: 500,
  MISSION: 400,
  AGENT: 300,
  CUSTOMER: 200,
  UNTRUSTED_CONTENT: 100,
};

export type AuthorityPrecedenceDecision = {
  protocol: "IGNIAQUA_AUTHORITY_PRECEDENCE_DECISION_V1";
  state: "ACCEPT_WITHIN_BOUNDARY" | "REJECT_LOWER_AUTHORITY_OVERRIDE";
  controllingAuthority: InstructionAuthority;
  proposedAuthority: InstructionAuthority;
  reason: string;
  authorityEffect: "NONE";
};

export function evaluateInstructionPrecedence(input: {
  controllingAuthority: InstructionAuthority;
  proposedAuthority: InstructionAuthority;
  wouldRelaxControllingBoundary: boolean;
}): AuthorityPrecedenceDecision {
  const lower = AUTHORITY_RANK[input.proposedAuthority] < AUTHORITY_RANK[input.controllingAuthority];
  if (input.wouldRelaxControllingBoundary && lower) {
    return {
      protocol: "IGNIAQUA_AUTHORITY_PRECEDENCE_DECISION_V1",
      state: "REJECT_LOWER_AUTHORITY_OVERRIDE",
      controllingAuthority: input.controllingAuthority,
      proposedAuthority: input.proposedAuthority,
      reason: "LOWER_AUTHORITY_CANNOT_RELAX_HIGHER_AUTHORITY_BOUNDARY",
      authorityEffect: "NONE",
    };
  }

  return {
    protocol: "IGNIAQUA_AUTHORITY_PRECEDENCE_DECISION_V1",
    state: "ACCEPT_WITHIN_BOUNDARY",
    controllingAuthority: input.controllingAuthority,
    proposedAuthority: input.proposedAuthority,
    reason: input.wouldRelaxControllingBoundary
      ? "PROPOSED_AUTHORITY_NOT_LOWER_THAN_CONTROLLING_AUTHORITY"
      : "INSTRUCTION_DOES_NOT_RELAX_CONTROLLING_BOUNDARY",
    authorityEffect: "NONE",
  };
}
