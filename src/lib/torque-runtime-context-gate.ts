/**
 * Conservative preflight for forwarding a conversation packet to an external
 * trained Torque runtime. No redaction is claimed: ambiguous text is blocked
 * until a human-approved minimizer exists.
 */
import type { ResponsePreparationPacket } from "./conversation-response-preparation";

export type TorqueContextDecision =
  | { state: "ELIGIBLE"; context: { questions: string[]; constraints: string[]; subjectRefs: string[]; summary: string | null } }
  | { state: "BLOCKED"; reason: "MISSING_APPROVAL" | "SENSITIVE_TEXT" | "UNTRUSTED_INSTRUCTION" | "EXCESSIVE_CONTEXT" };

const SENSITIVE = [
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\b(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/,
  /\b\d{3}[- ]?\d{2}[- ]?\d{4}\b/,
  /\b(?:ssn|social security|driver'?s license|bank account|routing number|credit card|password|api key|access token|date of birth|dob)\b/i,
];
const INSTRUCTION = /\b(?:ignore (?:all |previous |earlier )?instructions|system prompt|developer message|override safety|bypass (?:the )?(?:rules|policy)|reveal (?:the )?(?:secret|token|key))\b/i;

export function prepareMinimalTorqueContext(packet: ResponsePreparationPacket, approvedForExternalRuntime: boolean): TorqueContextDecision {
  if (!approvedForExternalRuntime) return { state: "BLOCKED", reason: "MISSING_APPROVAL" };
  const context = {
    questions: packet.customerStated.questions.slice(0, 20),
    constraints: packet.customerStated.constraints.slice(0, 20),
    subjectRefs: packet.customerStated.subjectRefs.slice(0, 20),
    summary: packet.customerStated.summary?.slice(0, 2000) ?? null,
  };
  const allText = [...context.questions, ...context.constraints, ...context.subjectRefs, context.summary ?? ""];
  if (allText.some(s => s.length > 500) || allText.join("").length > 6000) return { state: "BLOCKED", reason: "EXCESSIVE_CONTEXT" };
  if (allText.some(s => SENSITIVE.some(p => p.test(s)))) return { state: "BLOCKED", reason: "SENSITIVE_TEXT" };
  if (allText.some(s => INSTRUCTION.test(s))) return { state: "BLOCKED", reason: "UNTRUSTED_INSTRUCTION" };
  return { state: "ELIGIBLE", context };
}
