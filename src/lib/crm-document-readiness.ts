import type { Pool } from "pg";
import type { SecureDocumentKind } from "./customer-secure-document";

export type DeskDocumentReadinessItem = {
  kind: SecureDocumentKind;
  state: "MISSING" | "RECEIVED" | "REVIEW_REQUIRED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
};

export type DeskDocumentReadiness = {
  protocol: "NORAUTO_DESK_DOCUMENT_READINESS_V1";
  opportunityId: string;
  configured: boolean;
  state: "NOT_CONFIGURED" | "INCOMPLETE" | "READY_FOR_MANAGER_REVIEW";
  required: DeskDocumentReadinessItem[];
  rawDocumentsVisible: false;
  lenderSubmission: "NOT_PERFORMED";
  authorityEffect: "NONE";
};

const allowedKinds = new Set<SecureDocumentKind>([
  "TRADE_OFFER",
  "DRIVER_LICENSE",
  "INSURANCE",
  "PAYOFF_STATEMENT",
  "PROOF_OF_RESIDENCE",
  "DEAL_STIPULATION",
  "OTHER",
]);

export function parseRequiredDeskDocumentKinds(raw: string | undefined): SecureDocumentKind[] {
  if (!raw?.trim()) return [];
  const kinds = raw.split(",").map((value) => value.trim()).filter(Boolean);
  const unique: SecureDocumentKind[] = [];
  for (const value of kinds) {
    if (!allowedKinds.has(value as SecureDocumentKind)) {
      throw new Error(`Unsupported required desk document kind: ${value}`);
    }
    if (!unique.includes(value as SecureDocumentKind)) unique.push(value as SecureDocumentKind);
  }
  return unique;
}

export function deriveDeskDocumentReadiness(input: {
  opportunityId: string;
  requiredKinds: SecureDocumentKind[];
  observed: Array<{ kind: SecureDocumentKind; status: DeskDocumentReadinessItem["state"]; receivedAt: string }>;
}): DeskDocumentReadiness {
  if (input.requiredKinds.length === 0) {
    return {
      protocol: "NORAUTO_DESK_DOCUMENT_READINESS_V1",
      opportunityId: input.opportunityId,
      configured: false,
      state: "NOT_CONFIGURED",
      required: [],
      rawDocumentsVisible: false,
      lenderSubmission: "NOT_PERFORMED",
      authorityEffect: "NONE",
    };
  }

  const required = input.requiredKinds.map((kind) => {
    const latest = input.observed
      .filter((item) => item.kind === kind)
      .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))[0];
    return { kind, state: latest?.status ?? "MISSING" };
  });

  const ready = required.every((item) => item.state === "RECEIVED" || item.state === "ACCEPTED");
  return {
    protocol: "NORAUTO_DESK_DOCUMENT_READINESS_V1",
    opportunityId: input.opportunityId,
    configured: true,
    state: ready ? "READY_FOR_MANAGER_REVIEW" : "INCOMPLETE",
    required,
    rawDocumentsVisible: false,
    lenderSubmission: "NOT_PERFORMED",
    authorityEffect: "NONE",
  };
}

export async function readDeskDocumentReadiness(input: {
  pool: Pool;
  workspaceId: string;
  opportunityIds: string[];
  requiredKinds: SecureDocumentKind[];
}) {
  if (input.opportunityIds.length === 0) return new Map<string, DeskDocumentReadiness>();
  if (input.workspaceId !== "norautomatch") throw new Error("Document readiness refused a non-NorAutoMatch workspace.");

  const result = await input.pool.query<{
    opportunity_id: string;
    kind: SecureDocumentKind;
    status: DeskDocumentReadinessItem["state"];
    received_at: Date;
  }>(
    `SELECT d.opportunity_id, d.kind, d.status, d.received_at
       FROM customer_secure_documents d
       JOIN crm_opportunities o
         ON o.opportunity_id = d.opportunity_id
        AND o.workspace_id = $1
      WHERE d.opportunity_id = ANY($2::text[])
        AND d.raw_deleted_at IS NULL
        AND d.status <> 'UPLOAD_PENDING'
      ORDER BY d.opportunity_id, d.received_at DESC`,
    [input.workspaceId, input.opportunityIds],
  );

  const byOpportunity = new Map<string, Array<{ kind: SecureDocumentKind; status: DeskDocumentReadinessItem["state"]; receivedAt: string }>>();
  for (const row of result.rows) {
    const bucket = byOpportunity.get(row.opportunity_id) ?? [];
    bucket.push({ kind: row.kind, status: row.status, receivedAt: row.received_at.toISOString() });
    byOpportunity.set(row.opportunity_id, bucket);
  }

  const output = new Map<string, DeskDocumentReadiness>();
  for (const opportunityId of input.opportunityIds) {
    output.set(opportunityId, deriveDeskDocumentReadiness({
      opportunityId,
      requiredKinds: input.requiredKinds,
      observed: byOpportunity.get(opportunityId) ?? [],
    }));
  }
  return output;
}
