import type { LeadInventoryEvidence } from "./lead-inventory-evidence";
import type { LeadPayload } from "./lead-schema";

export type DeskPrepTruthState = "EVIDENCE_BACKED" | "CUSTOMER_STATED" | "ESTIMATE" | "UNVERIFIED";

export type DeskPrepPacket = {
  protocol: "NORAUTO_DESK_PREP_V1";
  createdAt: string;
  pipeline: LeadPayload["pipeline"];
  customer: {
    name: string;
    email: string;
    phone: string;
  };
  buyingLane: {
    budgetRange: string;
    paymentMethod: LeadPayload["paymentMethod"];
    monthlyTarget?: number;
    downPayment?: number;
    termMonths?: number;
    truthState: "CUSTOMER_STATED";
  };
  trade: {
    customerStatement?: string;
    valuationAuthority: "MANAGER_OR_APPROVED_TRADE_PROCESS_ONLY";
    truthState: "CUSTOMER_STATED" | "UNVERIFIED";
  };
  vehicleEvidence: LeadInventoryEvidence;
  notes: string;
  authority: {
    finalSellingPrice: "NOT_AUTHORIZED";
    financingApproval: "NOT_AUTHORIZED";
    paymentCommitment: "NOT_AUTHORIZED";
    tradeValuation: "NOT_AUTHORIZED";
    lenderSelection: "NOT_AUTHORIZED";
    dealApproval: "MANAGER_REQUIRED";
  };
  managerReviewRequired: true;
};

export function buildDeskPrepPacket(input: {
  lead: LeadPayload;
  inventoryEvidence: LeadInventoryEvidence;
  createdAt?: string;
}): DeskPrepPacket {
  const createdAt = input.createdAt ?? new Date().toISOString();
  const tradeStatement = input.lead.tradeIn?.trim();

  return {
    protocol: "NORAUTO_DESK_PREP_V1",
    createdAt,
    pipeline: input.lead.pipeline,
    customer: {
      name: `${input.lead.firstName} ${input.lead.lastName}`.trim(),
      email: input.lead.email,
      phone: input.lead.phone,
    },
    buyingLane: {
      budgetRange: input.lead.budgetRange,
      paymentMethod: input.lead.paymentMethod,
      monthlyTarget: input.lead.monthlyTarget,
      downPayment: input.lead.downPayment,
      termMonths: input.lead.termMonths,
      truthState: "CUSTOMER_STATED",
    },
    trade: {
      customerStatement: tradeStatement || undefined,
      valuationAuthority: "MANAGER_OR_APPROVED_TRADE_PROCESS_ONLY",
      truthState: tradeStatement ? "CUSTOMER_STATED" : "UNVERIFIED",
    },
    vehicleEvidence: input.inventoryEvidence,
    notes: input.lead.notes,
    authority: {
      finalSellingPrice: "NOT_AUTHORIZED",
      financingApproval: "NOT_AUTHORIZED",
      paymentCommitment: "NOT_AUTHORIZED",
      tradeValuation: "NOT_AUTHORIZED",
      lenderSelection: "NOT_AUTHORIZED",
      dealApproval: "MANAGER_REQUIRED",
    },
    managerReviewRequired: true,
  };
}
