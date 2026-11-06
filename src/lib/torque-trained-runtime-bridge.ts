import { z } from "zod";
import type { ResponsePreparationPacket } from "./conversation-response-preparation";

/**
 * Isolated server-side bridge candidate for an independently verified Torque runtime.
 * NOT wired to public routes. The caller must explicitly supply an approved HTTPS
 * endpoint, matching origin, credential, and the transport function.
 */
export const TORQUE_RUNTIME_REQUEST_PROTOCOL = "NORAUTO_TORQUE_RUNTIME_DRAFT_REQUEST_V1" as const;
export const TORQUE_RUNTIME_RESPONSE_PROTOCOL = "NORAUTO_TORQUE_RUNTIME_DRAFT_RESPONSE_V1" as const;

const runtimeResponseSchema = z.object({
  protocol: z.literal(TORQUE_RUNTIME_RESPONSE_PROTOCOL),
  draft: z.string().trim().min(1).max(6000),
  evidenceNeeded: z.array(z.enum([
    "AVAILABILITY", "PRICE", "INCENTIVES", "FINANCING", "RESERVATION", "APPOINTMENT",
  ])).max(6),
}).strict();

type RuntimeTransport = (url: string, init: RequestInit) => Promise<Response>;

export type TorqueRuntimeBridgeResult =
  | {
      state: "DRAFT_ONLY";
      draft: string;
      evidenceNeeded: string[];
      outboundExecution: "NOT_PERFORMED";
      customerReachedState: "NOT_CLAIMED";
      authorityEffect: "NONE";
    }
  | {
      state: "UNAVAILABLE";
      reason: "NOT_CONFIGURED" | "INVALID_ENDPOINT" | "INVALID_PACKET" | "RUNTIME_ERROR" | "INVALID_RESPONSE";
      outboundExecution: "NOT_PERFORMED";
      customerReachedState: "NOT_CLAIMED";
      authorityEffect: "NONE";
    };

function unavailable(reason: Extract<TorqueRuntimeBridgeResult, { state: "UNAVAILABLE" }>["reason"]): TorqueRuntimeBridgeResult {
  return { state: "UNAVAILABLE", reason, outboundExecution: "NOT_PERFORMED", customerReachedState: "NOT_CLAIMED", authorityEffect: "NONE" };
}

export async function prepareTorqueRuntimeDraft(input: {
  packet: ResponsePreparationPacket;
  endpoint?: string;
  approvedOrigin?: string;
  bearerToken?: string;
  transport?: RuntimeTransport;
}): Promise<TorqueRuntimeBridgeResult> {
  const { packet, endpoint, approvedOrigin, bearerToken } = input;
  if (!endpoint || !approvedOrigin || !bearerToken) return unavailable("NOT_CONFIGURED");

  let target: URL;
  let allow: URL;
  try {
    target = new URL(endpoint);
    allow = new URL(approvedOrigin);
  } catch {
    return unavailable("INVALID_ENDPOINT");
  }
  // Exact-origin allowlist; no credentials, fragments, or query tokens in URLs.
  if (
    target.protocol !== "https:" || allow.protocol !== "https:" ||
    target.origin !== allow.origin || allow.pathname !== "/" ||
    allow.search || allow.hash || target.username || target.password ||
    target.search || target.hash
  ) return unavailable("INVALID_ENDPOINT");

  if (
    packet.protocol !== "NORAUTO_RESPONSE_PREPARATION_PACKET_V1" ||
    packet.authorityEffect !== "DRAFT_PREPARATION_ONLY" ||
    packet.outboundExecution !== "NOT_PERFORMED" ||
    packet.customerReachedState !== "NOT_CLAIMED" ||
    packet.responseState === "NO_RESPONSE_ROUTE" ||
    !packet.conversationId || !packet.eventId
  ) return unavailable("INVALID_PACKET");

  // No customer name, contact details, raw transcript, secure-document bytes,
  // auth credentials, or storage paths are sent to the external runtime.
  const request = {
    protocol: TORQUE_RUNTIME_REQUEST_PROTOCOL,
    conversationId: packet.conversationId,
    eventId: packet.eventId,
    context: {
      questions: packet.customerStated.questions.slice(0, 20),
      constraints: packet.customerStated.constraints.slice(0, 20),
      subjectRefs: packet.customerStated.subjectRefs.slice(0, 20),
      summary: packet.customerStated.summary?.slice(0, 2000) ?? null,
    },
    evidenceRequirements: packet.evidenceRequirements.map((x) => x.topic),
    requestedAuthority: "DRAFT_ONLY",
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const transport = input.transport ?? fetch;
    const response = await transport(target.toString(), {
      method: "POST",
      redirect: "error",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${bearerToken}`,
      },
      body: JSON.stringify(request),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return unavailable("RUNTIME_ERROR");
    const lengthHeader = Number(response.headers.get("content-length"));
    if (Number.isFinite(lengthHeader) && lengthHeader > 16384) return unavailable("INVALID_RESPONSE");
    const raw = await response.text();
    if (raw.length > 16384) return unavailable("INVALID_RESPONSE");
    let json: unknown;
    try { json = JSON.parse(raw); } catch { return unavailable("INVALID_RESPONSE"); }
    const parsed = runtimeResponseSchema.safeParse(json);
    if (!parsed.success) return unavailable("INVALID_RESPONSE");
    return {
      state: "DRAFT_ONLY",
      draft: parsed.data.draft,
      evidenceNeeded: [...new Set([...packet.evidenceRequirements.map((x) => x.topic), ...parsed.data.evidenceNeeded])],
      outboundExecution: "NOT_PERFORMED",
      customerReachedState: "NOT_CLAIMED",
      authorityEffect: "NONE",
    };
  } catch {
    return unavailable("RUNTIME_ERROR");
  } finally {
    clearTimeout(timeout);
  }
}
