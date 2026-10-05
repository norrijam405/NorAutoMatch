import assert from "node:assert/strict";
import { normalizeOrrAlgoliaHit } from "../src/lib/orr-algolia-normalizer";
import type { OrrAlgoliaHit } from "../src/lib/orr-public-algolia";

const fetchedAt = "2026-09-17T00:00:00.000Z";

const recoverable: OrrAlgoliaHit = {
  objectID: "3992962",
  dealer_id: 2175,
  dealer_ids: [2175],
  vin: "3N8AP6CB1VL303920",
  stock_number: "VL303920",
  make_year: 2027,
  make: "Nissan",
  model: "Kicks",
  car_trim: "",
  price: 28914,
  functional_price: 28914,
  msrp: 29465,
  car_condition: "New",
  category: "SUV",
  is_active: true,
  archived: false,
  on_hold: false,
  stock_status: "in_stock",
};

const recovered = normalizeOrrAlgoliaHit(recoverable, fetchedAt);
assert.equal(recovered.record?.trim, "SV");
assert.equal(recovered.issue?.code, "IDENTITY_EVIDENCE_ENRICHED");
assert.ok(recovered.issue?.evidenceUrl?.includes("124833759"));

const mismatchedStock = normalizeOrrAlgoliaHit({ ...recoverable, stock_number: "WRONG" }, fetchedAt);
assert.equal(mismatchedStock.record, undefined);
assert.equal(mismatchedStock.issue?.code, "IDENTITY_INCOMPLETE");

const zeroPrice = normalizeOrrAlgoliaHit({
  ...recoverable,
  vin: "MAJ3S2GE2MC439019",
  stock_number: "832695A",
  make_year: 2021,
  make: "Ford",
  model: "EcoSport",
  car_trim: "SE",
  price: 0,
  functional_price: 0,
}, fetchedAt);
assert.equal(zeroPrice.record, undefined);
assert.equal(zeroPrice.issue?.code, "PRICE_INVALID");

console.log(JSON.stringify({
  recoveredVin: recovered.record?.vin,
  recoveredTrim: recovered.record?.trim,
  provenanceCode: recovered.issue?.code,
  mismatchedIdentityFailsClosed: mismatchedStock.issue?.code === "IDENTITY_INCOMPLETE",
  zeroPriceFailsClosed: zeroPrice.issue?.code === "PRICE_INVALID",
}, null, 2));
