export type IndustryScoutSourceClass =
  | "OEM_OFFICIAL"
  | "GOVERNMENT"
  | "INDUSTRY_DATA"
  | "TRADE_PRESS"
  | "DEALER_PUBLIC"
  | "SECONDARY_MEDIA";

export type IndustryScoutTopic =
  | "INCENTIVE"
  | "APR_LEASE_PROGRAM"
  | "MODEL_LAUNCH"
  | "MODEL_REFRESH"
  | "TRIM_FEATURE_CHANGE"
  | "PRICING"
  | "INVENTORY_SUPPLY"
  | "SALES_VOLUME"
  | "MARKET_SHARE"
  | "CONSUMER_DEMAND"
  | "EV_HYBRID"
  | "RECALL_SAFETY"
  | "COMPETITOR_MOVE"
  | "REGULATION"
  | "OWNERSHIP_COST";

export type IndustryScoutSource = {
  id: string;
  label: string;
  sourceClass: IndustryScoutSourceClass;
  url: string;
  authorityWeight: number;
  topics: IndustryScoutTopic[];
  enabled: boolean;
};

export type IndustryScoutObservation = {
  observationId: string;
  topic: IndustryScoutTopic;
  headline: string;
  summary: string;
  affectedMakes: string[];
  affectedModels: string[];
  market?: string;
  effectiveAt?: string;
  expiresAt?: string;
  observedAt: string;
  sourceId: string;
  sourceUrl: string;
  sourceClass: IndustryScoutSourceClass;
  evidenceState: "PRIMARY_VERIFIED" | "CORROBORATED" | "REPORTED" | "UNVERIFIED";
  salesImpact:
    | "HIGH_OPPORTUNITY"
    | "HIGH_RISK"
    | "MEDIUM"
    | "LOW"
    | "UNKNOWN";
  torqueUse:
    | "CUSTOMER_SAFE"
    | "SALESPERSON_ONLY"
    | "MANAGER_ONLY"
    | "DO_NOT_USE";
};

export const industryScoutSources: IndustryScoutSource[] = [
  {
    id: "nissan-usa",
    label: "Nissan USA",
    sourceClass: "OEM_OFFICIAL",
    url: "https://www.nissanusa.com/",
    authorityWeight: 100,
    topics: ["INCENTIVE","APR_LEASE_PROGRAM","MODEL_LAUNCH","MODEL_REFRESH","TRIM_FEATURE_CHANGE","PRICING","EV_HYBRID"],
    enabled: true,
  },
  {
    id: "nissan-news",
    label: "Nissan U.S. Newsroom",
    sourceClass: "OEM_OFFICIAL",
    url: "https://usa.nissannews.com/",
    authorityWeight: 100,
    topics: ["MODEL_LAUNCH","MODEL_REFRESH","TRIM_FEATURE_CHANGE","COMPETITOR_MOVE","EV_HYBRID","SALES_VOLUME"],
    enabled: true,
  },
  {
    id: "nhtsa",
    label: "NHTSA",
    sourceClass: "GOVERNMENT",
    url: "https://www.nhtsa.gov/",
    authorityWeight: 100,
    topics: ["RECALL_SAFETY","REGULATION"],
    enabled: true,
  },
  {
    id: "epa",
    label: "U.S. EPA",
    sourceClass: "GOVERNMENT",
    url: "https://www.epa.gov/",
    authorityWeight: 100,
    topics: ["EV_HYBRID","OWNERSHIP_COST","REGULATION"],
    enabled: true,
  },
  {
    id: "fueleconomy-gov",
    label: "FuelEconomy.gov",
    sourceClass: "GOVERNMENT",
    url: "https://www.fueleconomy.gov/",
    authorityWeight: 100,
    topics: ["OWNERSHIP_COST","EV_HYBRID"],
    enabled: true,
  },
  {
    id: "cox-automotive",
    label: "Cox Automotive",
    sourceClass: "INDUSTRY_DATA",
    url: "https://www.coxautoinc.com/",
    authorityWeight: 90,
    topics: ["PRICING","INVENTORY_SUPPLY","SALES_VOLUME","CONSUMER_DEMAND","EV_HYBRID"],
    enabled: true,
  },
  {
    id: "jd-power",
    label: "J.D. Power Automotive",
    sourceClass: "INDUSTRY_DATA",
    url: "https://www.jdpower.com/business/automotive",
    authorityWeight: 90,
    topics: ["PRICING","SALES_VOLUME","CONSUMER_DEMAND","OWNERSHIP_COST"],
    enabled: true,
  },
  {
    id: "sp-global-mobility",
    label: "S&P Global Mobility",
    sourceClass: "INDUSTRY_DATA",
    url: "https://www.spglobal.com/mobility/",
    authorityWeight: 90,
    topics: ["SALES_VOLUME","MARKET_SHARE","CONSUMER_DEMAND","INVENTORY_SUPPLY","EV_HYBRID"],
    enabled: true,
  },
  {
    id: "automotive-news",
    label: "Automotive News",
    sourceClass: "TRADE_PRESS",
    url: "https://www.autonews.com/",
    authorityWeight: 80,
    topics: ["COMPETITOR_MOVE","MODEL_LAUNCH","PRICING","INVENTORY_SUPPLY","SALES_VOLUME","MARKET_SHARE"],
    enabled: true,
  },
];

export function mayUseIndustryObservationForCustomer(observation: IndustryScoutObservation) {
  return (
    observation.torqueUse === "CUSTOMER_SAFE" &&
    (observation.evidenceState === "PRIMARY_VERIFIED" || observation.evidenceState === "CORROBORATED")
  );
}

export function requiresPrimarySource(topic: IndustryScoutTopic) {
  return (
    topic === "INCENTIVE" ||
    topic === "APR_LEASE_PROGRAM" ||
    topic === "RECALL_SAFETY" ||
    topic === "PRICING" ||
    topic === "TRIM_FEATURE_CHANGE"
  );
}
