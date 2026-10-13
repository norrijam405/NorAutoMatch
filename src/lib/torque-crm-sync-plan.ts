import { createHash } from "node:crypto";
import type { DealershipCrmAdapterEvidence, DealershipCrmCapability } from "./dealership-crm-adapter";
import type { TorquePreparedFollowUp } from "./torque-follow-up-draft";
import type { VehicleHunt } from "./vehicle-hunt";

export type TorqueCrmSyncPlan = {
  protocol: "NORAUTO_TORQUE_CRM_SYNC_PLAN_V1";
  huntId: string;
  providerId: string;
  state: "READY_FOR_AUTHORIZED_ADAPTER" | "BLOCKED_UNVERIFIED_ADAPTER" | "BLOCKED_CAPABILITY_MISSING";
  requiredCapabilities: DealershipCrmCapability[];
  noteBody: string;
  task?: {
    channel: "TEXT" | "EMAIL";
    subject: string;
    body: string;
    dueAt: string;
  };
  idempotencyKey: string;
  outboundExecution: "NOT_PERFORMED";
  crmWriteState: "NOT_WRITTEN";
  authorityEffect: "NONE";
  reasons: string[];
};

export function buildTorqueCrmSyncPlan(input: {
  hunt: Pick<VehicleHunt, "huntId" | "state" | "explicitCustomerText" | "candidateVins" | "truth">;
  adapterEvidence: DealershipCrmAdapterEvidence;
  preparedFollowUp?: TorquePreparedFollowUp;
  dueAt?: string;
}): TorqueCrmSyncPlan {
  const requiredCapabilities: DealershipCrmCapability[] = ["WRITE_HUNT_REFERENCE", "CREATE_NOTE"];
  if (input.preparedFollowUp) requiredCapabilities.push("CREATE_TASK");

  const reasons: string[] = [];
  let state: TorqueCrmSyncPlan["state"] = "READY_FOR_AUTHORIZED_ADAPTER";

  if (input.adapterEvidence.contractState !== "VERIFIED_AUTHORIZED_CONTRACT") {
    state = "BLOCKED_UNVERIFIED_ADAPTER";
    reasons.push("CRM_ADAPTER_CONTRACT_NOT_VERIFIED");
  } else {
    const missing = requiredCapabilities.filter((capability) => !input.adapterEvidence.capabilities.includes(capability));
    if (missing.length > 0) {
      state = "BLOCKED_CAPABILITY_MISSING";
      reasons.push(...missing.map((capability) => "MISSING_CAPABILITY:" + capability));
    }
  }

  const topCandidate = input.hunt.candidateVins[0];
  const noteLines = [
    "Torque Vehicle Hunt: " + input.hunt.huntId,
    "Customer request: " + input.hunt.explicitCustomerText,
    "Hunt state: " + input.hunt.state,
    topCandidate ? "Top candidate VIN: " + topCandidate.vin + " (" + topCandidate.fit + ")" : "Top candidate VIN: none verified",
    "Sourcing required: " + String(input.hunt.truth.sourcingRequired),
    "Human verification required: " + String(input.hunt.truth.humanVerificationRequired),
    "Transfer promised: false",
    "Financing promised: false",
  ];

  const dueAt = input.dueAt ?? new Date(Date.now() + 15 * 60_000).toISOString();
  if (Number.isNaN(Date.parse(dueAt))) throw new Error("CRM sync task due time is invalid.");

  const idempotencyKey = createHash("sha256").update(JSON.stringify({
    huntId: input.hunt.huntId,
    providerId: input.adapterEvidence.providerId,
    followUpReason: input.preparedFollowUp?.reason ?? null,
    channel: input.preparedFollowUp?.channel ?? null,
    dueAt,
  }), "utf8").digest("hex");

  return {
    protocol: "NORAUTO_TORQUE_CRM_SYNC_PLAN_V1",
    huntId: input.hunt.huntId,
    providerId: input.adapterEvidence.providerId,
    state,
    requiredCapabilities,
    noteBody: noteLines.join("\n"),
    task: input.preparedFollowUp
      ? {
          channel: input.preparedFollowUp.channel,
          subject: input.preparedFollowUp.subject ?? "Torque vehicle-search follow-up",
          body: input.preparedFollowUp.body,
          dueAt,
        }
      : undefined,
    idempotencyKey,
    outboundExecution: "NOT_PERFORMED",
    crmWriteState: "NOT_WRITTEN",
    authorityEffect: "NONE",
    reasons,
  };
}
