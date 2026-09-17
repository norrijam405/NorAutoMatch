import assert from "node:assert/strict";
import { dedupePhotoUrls, mergeVehiclePhotoUrls } from "../src/lib/lot-photo-merge";

const lot = [
  "https://example.supabase.co/storage/v1/object/public/vehicle-lot-photos/VIN/cover.webp",
  "https://example.supabase.co/storage/v1/object/public/vehicle-lot-photos/VIN/side.webp#preview",
];
const provider = [
  "https://images.app.ridemotive.com/provider-a",
  "https://example.supabase.co/storage/v1/object/public/vehicle-lot-photos/VIN/side.webp",
  "https://images.app.ridemotive.com/provider-b",
];

const merged = mergeVehiclePhotoUrls(lot, provider);
assert.deepEqual(merged, [
  lot[0],
  lot[1],
  provider[0],
  provider[2],
]);
assert.equal(merged[0], lot[0]);
assert.deepEqual(mergeVehiclePhotoUrls([], provider), provider);
assert.deepEqual(mergeVehiclePhotoUrls([], []), ["/images/vehicle-placeholder.jpg"]);
assert.deepEqual(dedupePhotoUrls([" https://example.com/a.jpg ", "https://example.com/a.jpg#x"]), ["https://example.com/a.jpg"]);

console.log(JSON.stringify({
  lotPhotosLead: merged[0] === lot[0],
  duplicateRemoved: merged.length === 4,
  providerFallbackPreserved: mergeVehiclePhotoUrls([], provider).length === provider.length,
  placeholderFallbackPreserved: mergeVehiclePhotoUrls([], [])[0] === "/images/vehicle-placeholder.jpg",
}, null, 2));
