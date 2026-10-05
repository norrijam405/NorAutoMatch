export type CustomerDealPrepDocument = {
  kind: string;
  status: string;
  opportunityId: string | null;
  rawDeletedAt: string | null;
};

export type CustomerDealPrepSummary = {
  protocol: "NORAUTO_CUSTOMER_DEAL_PREP_V1";
  savedVehicleCount: number;
  documentCount: number;
  linkedDocumentCount: number;
  readyDocumentCount: number;
  unresolvedDocumentCount: number;
  workspaceState: "GETTING_STARTED" | "BUILDING_PACKET" | "DESK_LINKED";
  lenderSubmission: "NOT_PERFORMED";
  financingApproval: "NOT_CLAIMED";
  rawDocumentsVisibleToTorque: false;
  authorityEffect: "NONE";
};

export function buildCustomerDealPrepSummary(input: {
  savedVehicleCount: number;
  documents: CustomerDealPrepDocument[];
}): CustomerDealPrepSummary {
  const active = input.documents.filter((doc) => !doc.rawDeletedAt && doc.status !== "EXPIRED");
  const linked = active.filter((doc) => Boolean(doc.opportunityId));
  const ready = active.filter((doc) => doc.status === "RECEIVED" || doc.status === "ACCEPTED");
  const unresolved = active.filter((doc) => !["RECEIVED", "ACCEPTED"].includes(doc.status));

  const workspaceState =
    linked.length > 0
      ? "DESK_LINKED"
      : input.savedVehicleCount > 0 || active.length > 0
        ? "BUILDING_PACKET"
        : "GETTING_STARTED";

  return {
    protocol: "NORAUTO_CUSTOMER_DEAL_PREP_V1",
    savedVehicleCount: Math.max(0, input.savedVehicleCount),
    documentCount: active.length,
    linkedDocumentCount: linked.length,
    readyDocumentCount: ready.length,
    unresolvedDocumentCount: unresolved.length,
    workspaceState,
    lenderSubmission: "NOT_PERFORMED",
    financingApproval: "NOT_CLAIMED",
    rawDocumentsVisibleToTorque: false,
    authorityEffect: "NONE",
  };
}
