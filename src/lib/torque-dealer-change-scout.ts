import type { Vehicle } from "./inventory";

/**
 * Read-only change scout for consecutive successfully verified FULL dealer
 * snapshots in this running process. No persistent storage, customer data,
 * outbound messages, or claims that a missing VIN has sold.
 */
export type TorqueDealerChange = {
  vin: string;
  kind: "PRICE_CHANGE" | "MILEAGE_CHANGE" | "STOCK_STATUS_CHANGE";
  before: string;
  after: string;
};
export type TorqueDealerScoutReceipt = {
  state: "BASELINE" | "UNCHANGED" | "CHANGES";
  observedAt: string;
  changes: TorqueDealerChange[];
  disclaimer: string;
};
type Checked = Pick<Vehicle, "id" | "price" | "mileage" | "mileageVerified" | "sourceStockStatus">;
let prior: Map<string, Checked> | undefined;
const caution = "Observed changes between two complete public dealer snapshots in one preview server. These are not sale confirmations; other servers may have different observation history.";
export function observeTorqueDealerCatalog(vehicles: readonly Vehicle[], observedAt = new Date().toISOString()): TorqueDealerScoutReceipt {
  const next = new Map(vehicles.filter(v=>/^[A-HJ-NPR-Z0-9]{17}$/i.test(v.id)).map(v=>[v.id.toUpperCase(),{
    id:v.id,price:v.price,mileage:v.mileage,mileageVerified:v.mileageVerified,sourceStockStatus:v.sourceStockStatus,
  }]));
  if (next.size === 0) return {state:"UNCHANGED",observedAt,changes:[],disclaimer:"No verified VIN observations; baseline was not replaced."};
  const changes: TorqueDealerChange[] = [];
  if (prior) {
    for (const [vin, now] of next) {
      const old = prior.get(vin);
      if (!old) continue; // new VIN arrival != source-confirmed in stock
      if (old.price > 0 && now.price > 0 && old.price !== now.price)
        changes.push({vin,kind:"PRICE_CHANGE",before:String(old.price),after:String(now.price)});
      if (old.mileageVerified && now.mileageVerified && old.mileage !== now.mileage)
        changes.push({vin,kind:"MILEAGE_CHANGE",before:String(old.mileage),after:String(now.mileage)});
      if (old.sourceStockStatus && now.sourceStockStatus && old.sourceStockStatus !== now.sourceStockStatus)
        changes.push({vin,kind:"STOCK_STATUS_CHANGE",before:old.sourceStockStatus,after:now.sourceStockStatus});
    }
  }
  const baseline = !prior;
  prior = next;
  return {state: baseline ? "BASELINE" : changes.length ? "CHANGES" : "UNCHANGED",
    observedAt,changes:changes.slice(0,30),disclaimer:caution};
}
