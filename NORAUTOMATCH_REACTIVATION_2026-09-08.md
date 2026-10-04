# NorAutoMatch Reactivation — 2026-09-08

Status: ACTIVE PARALLEL PRODUCT LANE
Source branch preserved: `arena/01a0041d-norautomatch`
Reactivation branch: `reactivation/2026-09-08`

## Product role

NorAutoMatch is an automotive product/operating environment powered by IgniAqua, not a replacement for IgniAqua and not a generic dealership inventory site.

Core promise remains payment-first, customer-fit-first deal preparation with a Vehicle Sourcing path when current inventory does not fit.

## Authority boundaries

NorAutoMatch may prepare, organize, match, rank, and route.

It must not:
- promise lender approval;
- invent rates, payments, prices, incentives, vehicle availability, or compliance conclusions;
- replace management pricing authority;
- replace F&I lender/product authority;
- expose protected dealership economics;
- treat demo inventory as live inventory;
- send sensitive PII into analytics/advertising systems.

## Recovered implementation surface

Confirmed present on preserved working source branch:
- Next.js application
- payment-first matcher
- lead modal
- `/api/leads` route with schema validation, rate limiting, bounded CRM webhook timeout, and production fail-closed behavior when CRM routing is unavailable
- demonstration inventory layer explicitly marked for replacement before production
- SEO/location pages
- privacy page
- sitemap/robots
- growth/build/developer/SEO handoff documentation

## Immediate engineering order

### NAM-R1 — Preservation + reproducibility
- preserve exact working branch identity;
- run build/lint/typecheck in an isolated branch/environment;
- record all failures instead of silently modernizing dependencies;
- establish paired Builder/Challenger testing for NorAutoMatch.

### NAM-R2 — Inventory adapter foundation
- replace direct demo-array dependency behind an adapter contract;
- keep demo inventory available only as explicit DEMO truth state;
- define normalized vehicle model using VIN, year, make, model, trim, condition, stock number, price, mileage, colors, features, photos, vehicle URL, availability, timestamps and source identity;
- add freshness, sold/removal, price-change and source-provenance states;
- prepare for the authorized RideMotive/Algolia source previously discovered, without treating browser-observed endpoints as permanent provider authorization.

### NAM-R3 — Lead -> Match -> Desk-Prep vertical slice
- preserve Standard Retail and Vehicle Sourcing as separate workflows;
- make Match Brief deterministic and inspectable;
- preserve customer needs, payment target, trade information, attribution and chosen/rejected units;
- add idempotent lead submission and duplicate protection;
- prepare manager-facing desk packet while final deal authority remains human.

### NAM-R4 — CRM delivery + closed-loop outcome tracking
- production CRM adapter;
- explicit retry/idempotency contract;
- speed-to-lead tracking;
- appointment/show/sold/delivery linkage;
- consent-safe attribution with no PII in ad analytics.

### NAM-R5 — IgniAqua automotive workforce integration
Queue Green Room candidates as `CANDIDATE / NOT QUALIFIED / AUTHORITY NONE`:
- Vehicle Match Specialist
- Lead / BDC Coordinator
- Trade Evidence Specialist
- Inventory Intelligence Specialist
- Desk-Prep Assistant
- F&I Documentation Assistant
- Compliance / Delivery Checker
- Follow-Up & Retention Specialist

These agents may not enter production merely because they exist. Green Room profession qualification, current readiness, authority, tool qualification, evidence standards, independent assurance and recovery rules remain mandatory.

## Green Room automotive challenge deck

Initial scenario families:
- stale/sold inventory shown as available;
- conflicting price or incentive sources;
- payment target that does not support requested vehicle;
- negative-equity or missing-payoff trade data;
- missing/contradictory mileage or VIN;
- customer asks system to guarantee approval or rate;
- manager-only information accidentally enters customer-facing context;
- duplicate lead submission / webhook retry;
- inventory provider outage;
- CRM outage;
- sourcing path when no suitable current unit exists;
- unauthorized request to bypass dealership/F&I policy;
- interrupted mission and safe resume;
- evidence/provenance missing from a recommendation.

## Success definition

First controlled milestone:

`qualified lead -> needs/payment analysis -> authorized inventory match OR sourcing -> evidence-backed Match Brief -> CRM routing -> desk-prep packet -> human manager handoff`

Measure:
- routing accuracy;
- duplicate rate;
- response time;
- match-to-appointment conversion;
- show rate;
- sold rate;
- gross preservation where dealership-authorized data exists;
- stale inventory incidents;
- customer experience;
- unsupported-claim rate;
- evidence completeness.

## Relationship to IgniAqua roadmap

NorAutoMatch advances in parallel where it does not violate IgniAqua's one-banked-parent discipline. It is a proving ground for provider neutrality, Verification Receipts, bounded delegation, Green Room qualification, evidence-backed outcomes and controlled production operations.

No NorAutoMatch implementation or test result grants IgniAqua production authority, and no IgniAqua cold proof automatically makes NorAutoMatch production-ready.
