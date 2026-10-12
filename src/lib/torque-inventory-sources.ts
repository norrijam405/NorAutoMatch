export type TorqueInventoryScope =
  | "LOCAL_STORE"
  | "ORR_GROUP"
  | "ORR_NISSAN_SIBLING";

export type TorqueInventorySource = {
  id: string;
  label: string;
  scope: TorqueInventoryScope;
  makePolicy: "ANY" | "NISSAN_ONLY";
  conditionPolicy: "ANY" | "NEW_ONLY";
  customerAuthority: "DIRECT_MATCH" | "VERIFY_WITH_HUMAN";
  sourceUrl: string;
  enabled: boolean;
};

export const torqueInventorySources: TorqueInventorySource[] = [
  {
    id: "orr-nissan-west",
    label: "Orr Nissan West OKC",
    scope: "LOCAL_STORE",
    makePolicy: "ANY",
    conditionPolicy: "ANY",
    customerAuthority: "DIRECT_MATCH",
    sourceUrl: "https://www.orrnissanwest.com/",
    enabled: true,
  },
  {
    id: "orr-auto-group",
    label: "Orr Auto Group",
    scope: "ORR_GROUP",
    makePolicy: "ANY",
    conditionPolicy: "ANY",
    customerAuthority: "VERIFY_WITH_HUMAN",
    sourceUrl: "https://www.orrauto.com/search-inventory/",
    enabled: true,
  },
  {
    id: "orr-nissan-central",
    label: "Orr Nissan Central OKC",
    scope: "ORR_NISSAN_SIBLING",
    makePolicy: "NISSAN_ONLY",
    conditionPolicy: "NEW_ONLY",
    customerAuthority: "VERIFY_WITH_HUMAN",
    sourceUrl: "https://www.orrauto.com/search-inventory/",
    enabled: true,
  },
  {
    id: "orr-nissan-del-city",
    label: "Orr Nissan of Del City",
    scope: "ORR_NISSAN_SIBLING",
    makePolicy: "NISSAN_ONLY",
    conditionPolicy: "NEW_ONLY",
    customerAuthority: "VERIFY_WITH_HUMAN",
    sourceUrl: "https://www.orrauto.com/search-inventory/",
    enabled: true,
  },
  {
    id: "orr-nissan-bossier",
    label: "Orr Nissan of Bossier",
    scope: "ORR_NISSAN_SIBLING",
    makePolicy: "NISSAN_ONLY",
    conditionPolicy: "NEW_ONLY",
    customerAuthority: "VERIFY_WITH_HUMAN",
    sourceUrl: "https://www.orrauto.com/search-inventory/",
    enabled: true,
  },
  {
    id: "orr-nissan-shreveport",
    label: "Orr Nissan Shreveport",
    scope: "ORR_NISSAN_SIBLING",
    makePolicy: "NISSAN_ONLY",
    conditionPolicy: "NEW_ONLY",
    customerAuthority: "VERIFY_WITH_HUMAN",
    sourceUrl: "https://www.orrauto.com/search-inventory/",
    enabled: true,
  },
  {
    id: "orr-nissan-fort-smith",
    label: "Orr Nissan of Fort Smith",
    scope: "ORR_NISSAN_SIBLING",
    makePolicy: "NISSAN_ONLY",
    conditionPolicy: "NEW_ONLY",
    customerAuthority: "VERIFY_WITH_HUMAN",
    sourceUrl: "https://www.orrauto.com/search-inventory/",
    enabled: true,
  },
  {
    id: "orr-nissan-hot-springs",
    label: "Orr Nissan of Hot Springs",
    scope: "ORR_NISSAN_SIBLING",
    makePolicy: "NISSAN_ONLY",
    conditionPolicy: "NEW_ONLY",
    customerAuthority: "VERIFY_WITH_HUMAN",
    sourceUrl: "https://www.orrauto.com/search-inventory/",
    enabled: true,
  },
  {
    id: "orr-nissan-searcy",
    label: "Orr Nissan of Searcy",
    scope: "ORR_NISSAN_SIBLING",
    makePolicy: "NISSAN_ONLY",
    conditionPolicy: "NEW_ONLY",
    customerAuthority: "VERIFY_WITH_HUMAN",
    sourceUrl: "https://www.orrauto.com/search-inventory/",
    enabled: true,
  },
  {
    id: "orr-nissan-wichita",
    label: "Orr Nissan of Wichita",
    scope: "ORR_NISSAN_SIBLING",
    makePolicy: "NISSAN_ONLY",
    conditionPolicy: "NEW_ONLY",
    customerAuthority: "VERIFY_WITH_HUMAN",
    sourceUrl: "https://www.orrauto.com/search-inventory/",
    enabled: true,
  },
];

export type TorqueWatchtowerFinding = {
  sourceId: string;
  storeLabel: string;
  vin: string;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  exteriorColor?: string;
  price?: number;
  firstSeenAt: string;
  lastVerifiedAt: string;
  customerMatchRefs: string[];
  state: "OBSERVED" | "MATCHED_CUSTOMER_NEED" | "VERIFY_WITH_HUMAN";
};

export function isSiblingNewNissanSource(source: TorqueInventorySource) {
  return (
    source.enabled &&
    source.scope === "ORR_NISSAN_SIBLING" &&
    source.makePolicy === "NISSAN_ONLY" &&
    source.conditionPolicy === "NEW_ONLY"
  );
}
