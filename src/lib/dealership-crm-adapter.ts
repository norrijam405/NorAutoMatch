import type { VehicleHunt } from "./vehicle-hunt";

export type DealershipCrmCapability =
  | "CREATE_LEAD"
  | "UPDATE_LEAD"
  | "CREATE_NOTE"
  | "CREATE_TASK"
  | "READ_CUSTOMER"
  | "READ_LEAD"
  | "READ_TASK"
  | "READ_INVENTORY_REFERENCE"
  | "WRITE_HUNT_REFERENCE"
  | "WRITE_FOLLOW_UP_RESULT";

export type DealershipCrmAdapterEvidence = {
  providerId: string;
  adapterVersion: string;
  contractState: "UNVERIFIED" | "VERIFIED_AUTHORIZED_CONTRACT";
  authorizationRef: string | null;
  sourceContractRef: string | null;
  capabilities: DealershipCrmCapability[];
};

export type DealershipCrmLeadRef = {
  providerId: string;
  externalLeadId: string;
  externalCustomerId?: string;
  externalUrl?: string;
};

export type DealershipCrmTaskInput = {
  huntId: string;
  externalLeadId: string;
  dueAt: string;
  channel: "TEXT" | "EMAIL" | "CALL" | "INTERNAL";
  subject: string;
  body: string;
  idempotencyKey: string;
};

export type DealershipCrmHuntWriteInput = {
  hunt: VehicleHunt;
  leadRef?: DealershipCrmLeadRef;
  summary: string;
  idempotencyKey: string;
};

export interface DealershipCrmAdapter {
  readonly evidence: DealershipCrmAdapterEvidence;

  createLead?(input: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    source: string;
    notes?: string;
    idempotencyKey: string;
  }): Promise<DealershipCrmLeadRef>;

  updateLead?(input: {
    leadRef: DealershipCrmLeadRef;
    notes?: string;
    status?: string;
    idempotencyKey: string;
  }): Promise<void>;

  createNote?(input: {
    leadRef: DealershipCrmLeadRef;
    body: string;
    idempotencyKey: string;
  }): Promise<void>;

  createTask?(input: DealershipCrmTaskInput): Promise<void>;

  writeVehicleHunt?(input: DealershipCrmHuntWriteInput): Promise<void>;
}

export function requireAuthorizedDealershipCrmAdapter(
  evidence: DealershipCrmAdapterEvidence,
  capability: DealershipCrmCapability,
) {
  if (evidence.contractState !== "VERIFIED_AUTHORIZED_CONTRACT") {
    throw new Error("DEALERSHIP_CRM_ADAPTER_CONTRACT_NOT_VERIFIED");
  }
  if (!evidence.authorizationRef?.trim()) {
    throw new Error("DEALERSHIP_CRM_ADAPTER_AUTHORIZATION_NOT_EVIDENCED");
  }
  if (!evidence.sourceContractRef?.trim()) {
    throw new Error("DEALERSHIP_CRM_ADAPTER_SOURCE_CONTRACT_NOT_EVIDENCED");
  }
  if (!evidence.capabilities.includes(capability)) {
    throw new Error("DEALERSHIP_CRM_CAPABILITY_NOT_AUTHORIZED:" + capability);
  }
}

export async function writeHuntToDealershipCrm(input: {
  adapter: DealershipCrmAdapter;
  hunt: VehicleHunt;
  leadRef?: DealershipCrmLeadRef;
  summary: string;
  idempotencyKey: string;
}) {
  requireAuthorizedDealershipCrmAdapter(input.adapter.evidence, "WRITE_HUNT_REFERENCE");
  if (!input.adapter.writeVehicleHunt) {
    throw new Error("DEALERSHIP_CRM_ADAPTER_WRITE_HUNT_NOT_IMPLEMENTED");
  }
  await input.adapter.writeVehicleHunt({
    hunt: input.hunt,
    leadRef: input.leadRef,
    summary: input.summary,
    idempotencyKey: input.idempotencyKey,
  });
}
