# Provider-Neutral Inventory Cache v1

Status: CANDIDATE / NON-PRODUCTION

## Objective

Decouple NorAutoMatch customer-facing inventory from live dealership page rendering by introducing a controlled, auditable inventory ingestion and cache layer.

The design must support multiple authorized dealership sources without changing the customer-facing search, Garage, comparison, or media experience.

## Core flow

AUTHORIZED DEALER SOURCE
-> CONNECTOR / ADAPTER
-> RAW SOURCE SNAPSHOT
-> NORMALIZER
-> EVIDENCE / IDENTITY GATES
-> CANONICAL INVENTORY CACHE
-> CHANGE DETECTOR
-> CUSTOMER API / SEARCH / GARAGE

Media follows a parallel evidence-preserving path:

SOURCE IMAGE
-> immutable source reference + provenance
-> derived presentation asset
-> optional presentation cleanup

Derived media must never replace or rewrite the source record.

## Provider-neutral source contract

Every connector emits the same normalized envelope:

- provider_id
- dealership_id
- dealership_name
- source_url
- source_record_id
- source_fetched_at
- source_hash
- vin
- stock_number
- year / model-year designation
- make
- model
- trim
- condition
- price
- msrp
- mileage
- exterior_color
- interior_color
- drivetrain
- transmission
- engine
- fuel_type
- city_mpg
- highway_mpg
- body_type
- availability_state
- in_transit
- features[]
- source_photos[]
- vehicle_url

A connector may use an authorized API/feed, machine-readable provider endpoint, export, or permitted page parser. The adapter implementation is provider-specific; the normalized contract is not.

## Authority boundary

A connector may only ingest a dealership/source for which NorAutoMatch has explicit authorization or another valid basis to access and process the data.

The existence of a technically reachable endpoint does not imply permission to ingest it.

## Truth and provenance

The cache is a reconstructed current view, not the source of ultimate truth.

For every canonical vehicle state, preserve enough provenance to answer:

- which dealership/source supplied it,
- which source record/VIN it came from,
- when it was observed,
- what normalized values were derived,
- what changed since the prior observation,
- whether any presentation media was transformed.

## Reconciliation states

Suggested availability lifecycle:

OBSERVED
-> ACTIVE
-> MISSING_ONCE
-> MISSING_REPEATEDLY
-> UNAVAILABLE_CONFIRMED

A single missing fetch must not silently mark a vehicle sold.

Price, mileage, images, and availability changes should emit explicit diff events.

## Media rules

Original dealer images remain provenance evidence.

Derived assets may be cropped, resized, background-cleaned, or branded for presentation only when the transformation is allowed and does not change material facts about the vehicle.

Do not remove or alter visible damage, accessories, Monroney/window-sticker information, physical vehicle badging/decals, or other content where removal could materially misrepresent the vehicle.

Each derived asset records:

- source image URL/hash
- transform type
- transform version/model if applicable
- created_at
- derived asset hash/location

## Adapter examples

The initial adapter is Orr Nissan West / Ridemotive-Algolia because that source is already authorized and partially implemented.

Future adapters may include other providers or dealership websites, but must pass the same identity, provenance, freshness, and customer-safety gates before becoming customer-visible.

## Promotion rule

No connector is customer-visible merely because it can fetch data.

Each connector must prove:

1. authorization/source identity,
2. deterministic normalization,
3. VIN/stock identity integrity,
4. stale/sold reconciliation behavior,
5. no invented fields/features,
6. provenance preservation,
7. customer API compatibility,
8. failure isolation so one provider cannot corrupt other dealership inventories.

This architecture is intentionally provider-neutral; dealership-specific behavior belongs in adapters, not in the customer product.