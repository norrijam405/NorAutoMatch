import type { ConversationEvent } from "./conversation-gateway";

export type ProviderAdapterEvidence = {
  provider: string;
  adapterVersion: string;
  contractState: "UNVERIFIED" | "VERIFIED_AUTHORIZED_CONTRACT";
  authorizationRef: string | null;
  sourceContractRef: string | null;
};

export type ConversationProviderAdapter<TInput = unknown> = {
  readonly evidence: ProviderAdapterEvidence;
  normalize(input: TInput): ConversationEvent;
};

export function requireAuthorizedProviderContract(evidence: ProviderAdapterEvidence) {
  if (evidence.contractState !== "VERIFIED_AUTHORIZED_CONTRACT") {
    throw new Error("PROVIDER_ADAPTER_CONTRACT_NOT_VERIFIED");
  }
  if (!evidence.authorizationRef?.trim()) {
    throw new Error("PROVIDER_ADAPTER_AUTHORIZATION_NOT_EVIDENCED");
  }
  if (!evidence.sourceContractRef?.trim()) {
    throw new Error("PROVIDER_ADAPTER_SOURCE_CONTRACT_NOT_EVIDENCED");
  }
}

export const motiveAskAiAdapterEvidence: ProviderAdapterEvidence = {
  provider: "motive-ask-ai",
  adapterVersion: "0.0.0-unverified",
  contractState: "UNVERIFIED",
  authorizationRef: null,
  sourceContractRef: null,
};

export function normalizeMotiveAskAiEvent(_input: unknown): ConversationEvent {
  requireAuthorizedProviderContract(motiveAskAiAdapterEvidence);
  throw new Error("MOTIVE_ASK_AI_NORMALIZER_NOT_IMPLEMENTED");
}
