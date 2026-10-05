import { z } from "zod";

export const secureDocumentKindSchema = z.enum([
  "TRADE_OFFER",
  "DRIVER_LICENSE",
  "INSURANCE",
  "PAYOFF_STATEMENT",
  "PROOF_OF_RESIDENCE",
  "DEAL_STIPULATION",
  "OTHER",
]);

export type SecureDocumentKind = z.infer<typeof secureDocumentKindSchema>;

export const secureDocumentReceiptSchema = z.object({
  protocol: z.literal("NORAUTO_SECURE_DOCUMENT_RECEIPT_V1"),
  documentId: z.string().uuid(),
  opportunityId: z.string().trim().min(1).max(160),
  kind: secureDocumentKindSchema,
  receivedAt: z.string().datetime({ offset: true }),
  status: z.enum(["RECEIVED", "REVIEW_REQUIRED", "ACCEPTED", "REJECTED", "EXPIRED"]),
  source: z.literal("CUSTOMER_SECURE_UPLOAD"),
  storageRef: z.string().trim().min(1).max(512),
  originalFilename: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  byteSize: z.number().int().positive().max(25 * 1024 * 1024),
  sha256: z.string().regex(/^[a-f0-9]{64}$/i),
  uploadedByUserId: z.string().uuid().nullable(),
  authorityEffect: z.literal("NONE"),
});

export type SecureDocumentReceipt = z.infer<typeof secureDocumentReceiptSchema>;

export type AgentDocumentStatus = {
  protocol: "NORAUTO_AGENT_DOCUMENT_STATUS_V1";
  opportunityId: string;
  kind: SecureDocumentKind;
  status: SecureDocumentReceipt["status"];
  receivedAt: string;
  rawDocumentVisibleToAgent: false;
  storageRefVisibleToAgent: false;
  authorityEffect: "NONE";
};

export function toAgentDocumentStatus(receipt: SecureDocumentReceipt): AgentDocumentStatus {
  const parsed = secureDocumentReceiptSchema.parse(receipt);
  return {
    protocol: "NORAUTO_AGENT_DOCUMENT_STATUS_V1",
    opportunityId: parsed.opportunityId,
    kind: parsed.kind,
    status: parsed.status,
    receivedAt: parsed.receivedAt,
    rawDocumentVisibleToAgent: false,
    storageRefVisibleToAgent: false,
    authorityEffect: "NONE",
  };
}

export function documentKindAllowsChatSummary(kind: SecureDocumentKind) {
  return kind === "TRADE_OFFER";
}
