import type { TorqueSalesInventorySpec } from "./torque-sales-inventory-spec";
import type { TorqueInventoryAnswer } from "./torque-inventory-assistant";

/**
 * Deterministic next-action suggestions, independent of an LLM. An action
 * proposal never creates a reservation, appointment, CRM write or customer send.
 */
export type TorqueActionPlan = {
  protocol: "NORAUTO_TORQUE_NEXT_ACTION_V1";
  state: "PROPOSAL_ONLY";
  nextAction: "VERIFY_INVENTORY" | "HUMAN_SOURCE_NETWORK" | "VERIFY_MUST_HAVES" | "REVIEW_EXACT_OPTIONS";
  context: string;
  suggestedQuestions: string[];
  authorityEffect: "NONE";
};

export function planTorqueNextAction(input: {
  spec: TorqueSalesInventorySpec;
  result: TorqueInventoryAnswer;
}): TorqueActionPlan {
  const { spec, result } = input;
  const common = { protocol: "NORAUTO_TORQUE_NEXT_ACTION_V1" as const, state: "PROPOSAL_ONLY" as const, authorityEffect: "NONE" as const };
  if (result.mode === "representative-demo") {
    return { ...common, nextAction: "VERIFY_INVENTORY", context: "Demonstration records cannot establish dealer availability.", suggestedQuestions: ["Should a salesperson check verified Orr Nissan West listings?"] };
  }
  if (result.handoff.required || (result.exactCount === 0 && result.nearCount === 0)) {
    return { ...common, nextAction: "HUMAN_SOURCE_NETWORK", context: "No eligible local match was established; wider Orr Auto Group inventory is not automatically verified.", suggestedQuestions: ["May a salesperson look for your exact requirements across the Orr network?"] };
  }
  if (spec.seatingCapacity?.priority === "MUST_HAVE" || result.matches.some(match => match.compromises.length > 0)) {
    return { ...common, nextAction: "VERIFY_MUST_HAVES", context: "Important fit or equipment details require exact-VIN evidence.", suggestedQuestions: ["Which equipment details should we confirm on the exact VIN?"] };
  }
  return { ...common, nextAction: "REVIEW_EXACT_OPTIONS", context: "Eligible catalog matches exist; pricing, availability and terms are not promises.", suggestedQuestions: ["Would you like to compare the available evidence for your top two matches?"] };
}
