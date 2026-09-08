# NorAutoMatch NAM-R2 — Public Inventory Ingestion Plan

Status: ACTIVE DESIGN / IMPLEMENTATION AUTHORIZED / NO PRODUCTION CLAIM
Branch: reactivation/2026-09-08

## Decision
RideMotive API access is not available. NorAutoMatch will not block on vendor API access.

Primary inventory strategy becomes a dealership-authorized, read-only ingestion pipeline over the public Orr Nissan West inventory surface and any public frontend data endpoints required to render that inventory.

## Source Priority
1. Public structured frontend inventory data used by the dealership website, when accessible without privileged credentials.
2. Public vehicle detail/listing pages and embedded structured data.
3. HTML parsing fallback for fields not available through stable structured responses.

No private credentials, authentication bypass, write actions, or privileged vendor access are authorized by this plan.

## Canonical Vehicle Record
At minimum preserve:
- source
- source_url
- source_vehicle_id when present
- VIN
- stock_number
- year
- make
- model
- trim
- condition
- price
- MSRP
- mileage
- exterior_color
- interior_color
- drivetrain
- transmission
- engine
- fuel_type
- MPG when present
- body_type/category
- photos
- features when present
- advertised incentives when present
- availability_state
- first_seen_at
- last_seen_at
- fetched_at
- source_hash
- parser_version
- provenance/evidence references

## Freshness State Machine
ACTIVE_CURRENT — currently observed and inside freshness SLA.
ACTIVE_STALE — previously observed but latest refresh is too old to claim current availability.
MISSING_PENDING — absent from one refresh; do not immediately assert sold.
REMOVED_CONFIRMED — absent across configured confirmation window or public source explicitly marks unavailable/sold.
SOURCE_ERROR — source could not be reliably evaluated.

Rules:
- Never present stale or source-error inventory as confirmed available.
- Never infer SOLD from one failed fetch.
- Preserve historical price/status changes instead of overwriting evidence.
- VIN is the primary vehicle identity when present; stock number and source id remain supporting identities.

## State Change Events
Emit append-only events for:
- VEHICLE_FIRST_SEEN
- PRICE_CHANGED
- MSRP_CHANGED
- MILEAGE_CHANGED
- INCENTIVE_CHANGED
- AVAILABILITY_CHANGED
- VEHICLE_MISSING
- VEHICLE_REMOVED_CONFIRMED
- VEHICLE_REAPPEARED
- SOURCE_PARSE_CHANGED
- SOURCE_ERROR

Each event should preserve observed timestamp, prior value, new value, source URL, source hash, and parser version.

## Matcher Contract
The matcher may consume only normalized records that meet its freshness policy.

Customer-facing match output should eventually distinguish:
- why the unit fits the customer's stated needs;
- which dealer-listed facts support that match;
- when the inventory record was last verified;
- whether availability requires confirmation;
- that payment estimates are estimates and not lender approval.

## Security / Authority Boundary
READ-ONLY public data acquisition only.
No website modification.
No vendor impersonation.
No credential harvesting.
No CAPTCHA bypass.
No authenticated private endpoints unless separately authorized and provided.
No production write authority.

## Implementation Sequence
A. Capture current public inventory list and sample VDP responses.
B. Identify stable structured data before writing HTML selectors.
C. Build one-source adapter and canonical normalizer.
D. Add source hashing + provenance receipts.
E. Add freshness/state-change engine.
F. Add parser fixtures and mutation tests for missing/changed fields.
G. Replace hardcoded demo inventory behind a feature flag.
H. Run shadow comparison against public site before customer-visible activation.
I. Fail closed on stale/error states.
J. Only then allow active matching against live inventory.

## Acceptance Gates
- Same VIN does not duplicate across refreshes.
- Price/status changes are detected and history preserved.
- Missing fetch does not become false SOLD.
- Stale records are blocked from confirmed-availability recommendations.
- Parser changes fail closed rather than silently corrupting records.
- No PII enters analytics from inventory ingestion.
- Public source provenance is recoverable for every active record.

## Relationship to IgniAqua
This pipeline is a practical proving ground for:
- connector/evidence provenance;
- freshness qualification;
- state-change receipts;
- automotive Green Room training cases;
- Inventory Intelligence Specialist qualification;
- Vehicle Match Specialist evidence-backed recommendations.

This plan changes the inventory acquisition path only. It does not replace NorAutoMatch's existing matcher, CRM, Standard Retail / Vehicle Sourcing separation, or human dealership/F&I authority boundaries.
