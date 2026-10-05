import type { DeskPrepPacket } from "./desk-prep";
import type { AgentDocumentStatus, SecureDocumentKind } from "./customer-secure-document";

export type DealReadinessItem = {
  code: string;
  label: string;
  state: "READY" | "MISSING" | "REVIEW_REQUIRED";
  source: "DESK_PREP" | "SECURE_DOCUMENT";
};

export type DealReadinessSummary = {
  protocol: "NORAUTO_DEAL_READINESS_V1";
  readiness: "READY_FOR_MANAGER_REVIEW" | "INCOMPLETE";
  items: DealReadinessItem[];
  lenderSubmission: "NOT_PERFORMED";
  financingApproval: "NOT_CLAIMED";
  dealApproval: "MANAGER_REQUIRED";
  authorityEffect: "NONE";
};

export function buildDealReadiness(input: {
  deskPrep: DeskPrepPacket;
  documents: AgentDocumentStatus[];
  requiredDocumentKinds?: SecureDocumentKind[];
}): DealReadinessSummary {
  const requiredKinds = input.requiredDocumentKinds ?? [];
  const items: DealReadinessItem[] = [];

  items.push({
    code: "CUSTOMER_CONTACT",
    label: "Customer contact information",
    state: input.deskPrep.customer.name && input.deskPrep.customer.email && input.deskPrep.customer.phone ? "READY" : "MISSING",
    source: "DESK_PREP",
  });

  items.push({
    code: "VEHICLE_EVIDENCE",
    label: "Vehicle evidence",
    state: input.deskPrep.vehicleEvidence.state === "VERIFIED_LIVE" || input.deskPrep.vehicleEvidence.state === "NO_SHORTLIST"
      ? "READY"
      : "REVIEW_REQUIRED",
    source: "DESK_PREP",
  });

  for (const kind of requiredKinds) {
    const match = input.documents.find((doc) => doc.kind === kind);
    items.push({
      code: `DOCUMENT_${kind}`,
      label: kind.replaceAll("_", " ").toLowerCase(),
      state: !match
        ? "MISSING"
        : match.status === "ACCEPTED" || match.status === "RECEIVED"
          ? "READY"
          : "REVIEW_REQUIRED",
      source: "SECURE_DOCUMENT",
    });
  }

  const readiness = items.every((item) => item.state === "READY")
    ? "READY_FOR_MANAGER_REVIEW"
    : "INCOMPLETE";

  return {
    protocol: "NORAUTO_DEAL_READINESS_V1",
    readiness,
    items,
    lenderSubmission: "NOT_PERFORMED",
    financingApproval: "NOT_CLAIMED",
    dealApproval: "MANAGER_REQUIRED",
    authorityEffect: "NONE",
  };
}
