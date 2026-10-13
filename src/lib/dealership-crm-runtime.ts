import type {
  DealershipCrmAdapterEvidence,
  DealershipCrmCapability,
} from "./dealership-crm-adapter";

const ALL_CAPABILITIES: DealershipCrmCapability[] = [
  "CREATE_LEAD",
  "UPDATE_LEAD",
  "CREATE_NOTE",
  "CREATE_TASK",
  "READ_CUSTOMER",
  "READ_LEAD",
  "READ_TASK",
  "READ_INVENTORY_REFERENCE",
  "WRITE_HUNT_REFERENCE",
  "WRITE_FOLLOW_UP_RESULT",
];

export type DealershipCrmRuntimeState =
  | "UNCONFIGURED"
  | "EVIDENCE_INCOMPLETE"
  | "CAPABILITY_CONFIG_INVALID"
  | "ADAPTER_NOT_IMPLEMENTED"
  | "READY_FOR_ADAPTER_BINDING";

export type DealershipCrmRuntime = {
  protocol: "NORAUTO_DEALERSHIP_CRM_RUNTIME_V1";
  state: DealershipCrmRuntimeState;
  providerId?: string;
  evidence?: DealershipCrmAdapterEvidence;
  reasons: string[];
  secretState: "NOT_READ_BY_RUNTIME";
  writeAuthority: false;
};

export function resolveDealershipCrmRuntime(input: {
  providerId?: string;
  adapterVersion?: string;
  authorizationRef?: string;
  sourceContractRef?: string;
  capabilitiesCsv?: string;
  implementedProviderIds?: string[];
}): DealershipCrmRuntime {
  const providerId = input.providerId?.trim();
  if (!providerId) {
    return {
      protocol: "NORAUTO_DEALERSHIP_CRM_RUNTIME_V1",
      state: "UNCONFIGURED",
      reasons: ["CRM_PROVIDER_ID_NOT_CONFIGURED"],
      secretState: "NOT_READ_BY_RUNTIME",
      writeAuthority: false,
    };
  }

  const adapterVersion = input.adapterVersion?.trim();
  const authorizationRef = input.authorizationRef?.trim();
  const sourceContractRef = input.sourceContractRef?.trim();

  if (!adapterVersion || !authorizationRef || !sourceContractRef) {
    return {
      protocol: "NORAUTO_DEALERSHIP_CRM_RUNTIME_V1",
      state: "EVIDENCE_INCOMPLETE",
      providerId,
      reasons: [
        !adapterVersion ? "CRM_ADAPTER_VERSION_MISSING" : "",
        !authorizationRef ? "CRM_AUTHORIZATION_REF_MISSING" : "",
        !sourceContractRef ? "CRM_SOURCE_CONTRACT_REF_MISSING" : "",
      ].filter(Boolean),
      secretState: "NOT_READ_BY_RUNTIME",
      writeAuthority: false,
    };
  }

  const parsedCapabilities = parseCapabilities(input.capabilitiesCsv ?? "");
  if (!parsedCapabilities.ok) {
    return {
      protocol: "NORAUTO_DEALERSHIP_CRM_RUNTIME_V1",
      state: "CAPABILITY_CONFIG_INVALID",
      providerId,
      reasons: parsedCapabilities.reasons,
      secretState: "NOT_READ_BY_RUNTIME",
      writeAuthority: false,
    };
  }

  const evidence: DealershipCrmAdapterEvidence = {
    providerId,
    adapterVersion,
    contractState: "VERIFIED_AUTHORIZED_CONTRACT",
    authorizationRef,
    sourceContractRef,
    capabilities: parsedCapabilities.capabilities,
  };

  const implemented = new Set((input.implementedProviderIds ?? []).map((value) => value.trim().toLowerCase()));
  if (!implemented.has(providerId.toLowerCase())) {
    return {
      protocol: "NORAUTO_DEALERSHIP_CRM_RUNTIME_V1",
      state: "ADAPTER_NOT_IMPLEMENTED",
      providerId,
      evidence,
      reasons: ["CONFIG_EVIDENCE_PRESENT_BUT_PROVIDER_ADAPTER_NOT_IMPLEMENTED"],
      secretState: "NOT_READ_BY_RUNTIME",
      writeAuthority: false,
    };
  }

  return {
    protocol: "NORAUTO_DEALERSHIP_CRM_RUNTIME_V1",
    state: "READY_FOR_ADAPTER_BINDING",
    providerId,
    evidence,
    reasons: ["PROVIDER_EVIDENCE_AND_IMPLEMENTATION_DECLARED"],
    secretState: "NOT_READ_BY_RUNTIME",
    writeAuthority: false,
  };
}

function parseCapabilities(value: string):
  | { ok: true; capabilities: DealershipCrmCapability[] }
  | { ok: false; reasons: string[] } {
  const raw = value.split(",").map((item) => item.trim()).filter(Boolean);
  if (raw.length === 0) {
    return { ok: false, reasons: ["CRM_CAPABILITIES_NOT_CONFIGURED"] };
  }

  const allowed = new Set<string>(ALL_CAPABILITIES);
  const invalid = raw.filter((item) => !allowed.has(item));
  if (invalid.length > 0) {
    return {
      ok: false,
      reasons: invalid.map((item) => "UNKNOWN_CRM_CAPABILITY:" + item),
    };
  }

  return {
    ok: true,
    capabilities: [...new Set(raw)] as DealershipCrmCapability[],
  };
}
