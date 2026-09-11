export type InventoryAvailabilityState =
  | "ACTIVE_CURRENT"
  | "ACTIVE_STALE"
  | "MISSING_PENDING"
  | "REMOVED_CONFIRMED"
  | "SOURCE_ERROR";

export type InventoryEventType =
  | "VEHICLE_FIRST_SEEN"
  | "PRICE_CHANGED"
  | "MARKET_PRICE_CHANGED"
  | "DISCOUNT_CHANGED"
  | "DEALER_FEE_CHANGED"
  | "DISPLAYED_SUBTOTAL_CHANGED"
  | "MSRP_CHANGED"
  | "MILEAGE_CHANGED"
  | "INCENTIVE_CHANGED"
  | "AVAILABILITY_CHANGED"
  | "SOURCE_STOCK_STATUS_CHANGED"
  | "IN_TRANSIT_CHANGED"
  | "VEHICLE_MISSING"
  | "VEHICLE_REMOVED_CONFIRMED"
  | "VEHICLE_REAPPEARED"
  | "SOURCE_PARSE_CHANGED"
  | "SOURCE_ERROR";

export type LiveInventoryRecord = {
  source: string;
  sourceUrl: string;
  sourceVehicleId?: string;
  vin: string;
  stockNumber?: string;
  sourceStockStatus?: string;
  inTransit?: boolean;
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
  condition?: "New" | "Used" | "Certified" | string;
  /** Provider/dealer advertised vehicle price. This is not automatically an out-the-door price. */
  price?: number;
  /** Optional provider-supported pricing components. Undefined means not supplied/verified by the source. */
  marketPrice?: number;
  discountAmount?: number;
  docFee?: number;
  serviceHandlingFee?: number;
  otherDealerFees?: number;
  displayedDealerSubtotal?: number;
  msrp?: number;
  mileage?: number;
  exteriorColor?: string;
  interiorColor?: string;
  drivetrain?: string;
  transmission?: string;
  engine?: string;
  fuelType?: string;
  cityMpg?: number;
  highwayMpg?: number;
  bodyType?: string;
  photos?: string[];
  features?: string[];
  incentives?: string[];
  availabilityState: InventoryAvailabilityState;
  firstSeenAt: string;
  lastSeenAt: string;
  fetchedAt: string;
  sourceHash: string;
  parserVersion: string;
  consecutiveHealthyMisses: number;
};

export type InventoryEvent = {
  type: InventoryEventType;
  vin: string;
  observedAt: string;
  sourceUrl: string;
  sourceHash: string;
  parserVersion: string;
  field?: string;
  previousValue?: unknown;
  newValue?: unknown;
  /** Present only when both compared values are finite numbers. Positive means the observed value increased. */
  numericDelta?: number;
  note?: string;
};

export type RefreshPolicy = {
  normalRefreshMs: number;
  acceleratedRefreshMs: number;
  staleAfterMs: number;
  removalConfirmationMisses: number;
};

export const DEFAULT_REFRESH_POLICY: RefreshPolicy = {
  normalRefreshMs: 15 * 60 * 1000,
  acceleratedRefreshMs: 5 * 60 * 1000,
  staleAfterMs: 30 * 60 * 1000,
  removalConfirmationMisses: 2,
};

const trackedFields: Array<keyof Pick<
  LiveInventoryRecord,
  | "price"
  | "marketPrice"
  | "discountAmount"
  | "docFee"
  | "serviceHandlingFee"
  | "otherDealerFees"
  | "displayedDealerSubtotal"
  | "msrp"
  | "mileage"
  | "incentives"
  | "availabilityState"
  | "sourceStockStatus"
  | "inTransit"
>> = [
  "price",
  "marketPrice",
  "discountAmount",
  "docFee",
  "serviceHandlingFee",
  "otherDealerFees",
  "displayedDealerSubtotal",
  "msrp",
  "mileage",
  "incentives",
  "availabilityState",
  "sourceStockStatus",
  "inTransit",
];

const eventForField: Record<(typeof trackedFields)[number], InventoryEventType> = {
  price: "PRICE_CHANGED",
  marketPrice: "MARKET_PRICE_CHANGED",
  discountAmount: "DISCOUNT_CHANGED",
  docFee: "DEALER_FEE_CHANGED",
  serviceHandlingFee: "DEALER_FEE_CHANGED",
  otherDealerFees: "DEALER_FEE_CHANGED",
  displayedDealerSubtotal: "DISPLAYED_SUBTOTAL_CHANGED",
  msrp: "MSRP_CHANGED",
  mileage: "MILEAGE_CHANGED",
  incentives: "INCENTIVE_CHANGED",
  availabilityState: "AVAILABILITY_CHANGED",
  sourceStockStatus: "SOURCE_STOCK_STATUS_CHANGED",
  inTransit: "IN_TRANSIT_CHANGED",
};

function stableJson(value: unknown) {
  if (Array.isArray(value)) return JSON.stringify([...value].sort());
  return JSON.stringify(value);
}

function finiteNumericDelta(previousValue: unknown, newValue: unknown) {
  if (typeof previousValue !== "number" || typeof newValue !== "number") return undefined;
  if (!Number.isFinite(previousValue) || !Number.isFinite(newValue)) return undefined;
  return newValue - previousValue;
}

export function diffInventoryRecord(
  previous: LiveInventoryRecord | undefined,
  next: LiveInventoryRecord,
): InventoryEvent[] {
  const base = {
    vin: next.vin,
    observedAt: next.fetchedAt,
    sourceUrl: next.sourceUrl,
    sourceHash: next.sourceHash,
    parserVersion: next.parserVersion,
  };

  if (!previous) return [{ type: "VEHICLE_FIRST_SEEN", ...base }];

  const events: InventoryEvent[] = [];
  for (const field of trackedFields) {
    if (stableJson(previous[field]) !== stableJson(next[field])) {
      const numericDelta = finiteNumericDelta(previous[field], next[field]);
      events.push({
        type: eventForField[field],
        ...base,
        field,
        previousValue: previous[field],
        newValue: next[field],
        ...(numericDelta === undefined ? {} : { numericDelta }),
      });
    }
  }

  if (previous.availabilityState === "MISSING_PENDING" && next.availabilityState === "ACTIVE_CURRENT") {
    events.push({ type: "VEHICLE_REAPPEARED", ...base });
  }
  if (previous.availabilityState !== "REMOVED_CONFIRMED" && next.availabilityState === "REMOVED_CONFIRMED") {
    events.push({ type: "VEHICLE_REMOVED_CONFIRMED", ...base });
  }
  return events;
}

export function applyHealthyObservation(
  previous: LiveInventoryRecord | undefined,
  observed: Omit<LiveInventoryRecord, "firstSeenAt" | "lastSeenAt" | "availabilityState" | "consecutiveHealthyMisses">,
): LiveInventoryRecord {
  return {
    ...observed,
    firstSeenAt: previous?.firstSeenAt ?? observed.fetchedAt,
    lastSeenAt: observed.fetchedAt,
    availabilityState: "ACTIVE_CURRENT",
    consecutiveHealthyMisses: 0,
  };
}

export function applyHealthyAbsence(
  previous: LiveInventoryRecord,
  observedAt: string,
  policy: RefreshPolicy = DEFAULT_REFRESH_POLICY,
): LiveInventoryRecord {
  const misses = previous.consecutiveHealthyMisses + 1;
  return {
    ...previous,
    fetchedAt: observedAt,
    consecutiveHealthyMisses: misses,
    availabilityState: misses >= policy.removalConfirmationMisses ? "REMOVED_CONFIRMED" : "MISSING_PENDING",
  };
}

export function applySourceError(previous: LiveInventoryRecord, observedAt: string): LiveInventoryRecord {
  return { ...previous, fetchedAt: observedAt, availabilityState: "SOURCE_ERROR" };
}

export function qualifyFreshness(
  record: LiveInventoryRecord,
  nowMs = Date.now(),
  policy: RefreshPolicy = DEFAULT_REFRESH_POLICY,
): LiveInventoryRecord {
  if (record.availabilityState !== "ACTIVE_CURRENT") return record;
  const fetchedMs = Date.parse(record.fetchedAt);
  if (!Number.isFinite(fetchedMs)) return { ...record, availabilityState: "SOURCE_ERROR" };
  if (nowMs - fetchedMs > policy.staleAfterMs) return { ...record, availabilityState: "ACTIVE_STALE" };
  return record;
}

export function isMatchEligible(record: LiveInventoryRecord) {
  return record.availabilityState === "ACTIVE_CURRENT";
}

export function shouldAccelerateRefresh(input: {
  recentlyChanged: boolean;
  newlyObserved: boolean;
  tiedToActiveLead: boolean;
  shortlisted: boolean;
  appointmentPending: boolean;
  deskPrepActive: boolean;
}) {
  return Object.values(input).some(Boolean);
}

export function nextRefreshDelayMs(accelerated: boolean, policy: RefreshPolicy = DEFAULT_REFRESH_POLICY) {
  return accelerated ? policy.acceleratedRefreshMs : policy.normalRefreshMs;
}
