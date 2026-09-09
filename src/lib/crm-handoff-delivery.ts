import type { LeadInventoryEvidence } from "./lead-inventory-evidence";
import type { LeadPayload } from "./lead-schema";
import type { ManagerHandoffEnvelope } from "./manager-handoff";

export type CrmHandoffDeliveryPayload = {
  protocol: "NORAUTO_CRM_HANDOFF_V1";
  lead: LeadPayload & {
    inventoryEvidence: LeadInventoryEvidence;
    submittedAt: string;
    pageUrl: string;
    userAgent: string;
  };
  managerHandoff: ManagerHandoffEnvelope;
};

export function buildCrmHandoffDelivery(input: {
  lead: CrmHandoffDeliveryPayload["lead"];
  managerHandoff: ManagerHandoffEnvelope;
}) {
  if (input.managerHandoff.workflowState !== "MANAGER_REVIEW_PENDING") {
    throw new Error("Only manager-review-pending handoffs may be delivered to CRM.");
  }
  if (input.managerHandoff.authority.approveDeal !== "NOT_AUTHORIZED") {
    throw new Error("CRM handoff cannot carry NorAutoMatch deal-approval authority.");
  }

  const payload: CrmHandoffDeliveryPayload = {
    protocol: "NORAUTO_CRM_HANDOFF_V1",
    lead: input.lead,
    managerHandoff: input.managerHandoff,
  };

  return {
    payload,
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "NorAutoMatch-Leads/1.1",
      "Idempotency-Key": input.managerHandoff.idempotencyKey,
      "X-NorAuto-Handoff-Id": input.managerHandoff.handoffId,
      "X-NorAuto-Protocol": payload.protocol,
    },
  } as const;
}
