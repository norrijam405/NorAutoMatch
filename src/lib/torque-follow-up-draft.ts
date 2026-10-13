import type { VehicleHunt } from "./vehicle-hunt";

export type TorquePreparedFollowUp = {
  protocol: "NORAUTO_TORQUE_FOLLOW_UP_DRAFT_V1";
  huntId: string;
  channel: "TEXT" | "EMAIL";
  subject?: string;
  body: string;
  status: "PREPARED_NOT_SENT";
  reason: string;
  truthState: "DRAFT_ONLY";
  createdAt: string;
};

type FollowUpHuntView = Pick<
  VehicleHunt,
  "huntId" | "state" | "requirements" | "candidateVins" | "consentToContact"
>;

export function prepareTorqueHuntFollowUp(input: {
  hunt: FollowUpHuntView;
  channel: "TEXT" | "EMAIL";
  customerFirstName?: string;
  createdAt?: string;
}): TorquePreparedFollowUp {
  if (!input.hunt.consentToContact) {
    throw new Error("FOLLOW_UP_CONSENT_NOT_ESTABLISHED");
  }

  const firstName = input.customerFirstName?.trim();
  const greeting = firstName ? "Hey " + firstName + ", " : "";
  const need = summarizeNeed(input.hunt);
  const candidate = input.hunt.candidateVins[0];

  let reason = "VEHICLE_HUNT_UPDATE";
  let message = "";

  switch (input.hunt.state) {
    case "LOCAL_MATCH_FOUND":
      reason = "EXACT_LOCAL_MATCH";
      message =
        greeting +
        "I found a vehicle that lines up with what you asked for" +
        (need ? " — " + need : "") +
        ". I’m verifying the current details now. Want me to send you the specs?";
      break;

    case "NETWORK_MATCH_FOUND":
      reason = "NETWORK_MATCH_FOUND";
      message =
        greeting +
        "I found a strong match for what you wanted" +
        (need ? " — " + need : "") +
        " in our network. I’m going to verify availability and timing before I promise anything. Want me to check it out for you?";
      break;

    case "OUT_OF_NETWORK_MATCH_FOUND":
      reason = "SOURCING_MATCH_FOUND";
      message =
        greeting +
        "I found a vehicle that appears to match the spec you wanted" +
        (need ? " — " + need : "") +
        ". The best next step is to make sure the vehicle and numbers make sense, then we can work on sourcing the exact one. Want to set up a time to drive a comparable one?";
      break;

    case "AWAITING_HUMAN_VERIFICATION":
    case "SEARCHING":
      reason = "HUNT_STILL_ACTIVE";
      message =
        greeting +
        "I’m still hunting the exact vehicle you asked for" +
        (need ? " — " + need : "") +
        ". I don’t have a verified exact match to promise you yet, but I’m keeping the search active and I’ll reach out when something meaningful changes.";
      break;

    default:
      reason = "HUNT_STATUS_UPDATE";
      message =
        greeting +
        "I have an update on the vehicle search we started" +
        (need ? " for " + need : "") +
        ". I want to verify the details before I tell you anything that could be misleading.";
  }

  if (candidate?.fit === "NEAR" && candidate.compromises.length > 0) {
    message += " The closest option I found has a tradeoff: " + candidate.compromises[0] + ".";
  }

  if (input.channel === "TEXT") {
    return {
      protocol: "NORAUTO_TORQUE_FOLLOW_UP_DRAFT_V1",
      huntId: input.hunt.huntId,
      channel: "TEXT",
      body: message,
      status: "PREPARED_NOT_SENT",
      reason,
      truthState: "DRAFT_ONLY",
      createdAt: input.createdAt ?? new Date().toISOString(),
    };
  }

  return {
    protocol: "NORAUTO_TORQUE_FOLLOW_UP_DRAFT_V1",
    huntId: input.hunt.huntId,
    channel: "EMAIL",
    subject: subjectFor(input.hunt.state),
    body:
      message +
      "\n\nI can send over the relevant vehicle details and walk through the tradeoffs with you. Nothing in this message reserves a vehicle or promises transfer timing.",
    status: "PREPARED_NOT_SENT",
    reason,
    truthState: "DRAFT_ONLY",
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

function summarizeNeed(hunt: FollowUpHuntView) {
  const parts: string[] = [];
  const modelYear = hunt.requirements.modelYear?.value;
  if (typeof modelYear === "number") parts.push(String(modelYear));
  if (hunt.requirements.make?.value) parts.push(String(hunt.requirements.make.value));
  if (hunt.requirements.model?.value) parts.push(String(hunt.requirements.model.value));
  if (hunt.requirements.trim?.value) parts.push(String(hunt.requirements.trim.value));
  if (hunt.requirements.exteriorColor?.value) parts.push(String(hunt.requirements.exteriorColor.value));
  if (hunt.requirements.interiorColor?.value) parts.push(String(hunt.requirements.interiorColor.value));
  if (hunt.requirements.drivetrain?.value) parts.push(String(hunt.requirements.drivetrain.value));
  return parts.slice(0, 7).join(" ");
}

function subjectFor(state: VehicleHunt["state"]) {
  switch (state) {
    case "LOCAL_MATCH_FOUND":
      return "I found a strong match for your vehicle search";
    case "NETWORK_MATCH_FOUND":
      return "I found a match in our sourcing network";
    case "OUT_OF_NETWORK_MATCH_FOUND":
      return "I found a possible match for your exact spec";
    default:
      return "Update on your vehicle search";
  }
}
