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
SOLD_EXPLICIT — public source explicitly marks the unit sold/unavailable.
REMOVED_CONFIRMED — absent across configured confirmation window.
SOURCE_ERROR — source could not be reliably evaluated.

Rules:
- Never present stale or source-error inventory as confirmed available.
- Never infer SOLD from one failed fetch.
- Preserve historical price/status changes instead of overwriting evidence.
- VIN is the primary vehicle identity when present; stock number and source id remain supporting identities.
- Explicit public SOLD/unavailable state outranks absence inference.

## Adaptive Reaction / Refresh Policy
The ingestion layer must stay open to ordinary dealership-site change rather than assuming static inventory.

Recommended operating behavior:
- baseline inventory refresh every 15 minutes while the site/source is healthy;
- newly listed vehicles receive higher-frequency rechecks for their first 24 hours;
- vehicles with a recent price change receive higher-frequency rechecks for the next 6 hours;
- vehicles recently matched, shortlisted, or attached to an active lead may receive a just-in-time recheck before being shown as confirmed available;
- VDP-specific recheck should occur immediately before a high-confidence recommendation, appointment confirmation, or manager desk-prep handoff;
- if the public source returns rate-limit, instability, or parser-error signals, back off automatically rather than hammering the site;
- recovery from backoff requires successful source-health checks before returning to the normal cadence.

Suggested dynamic cadence:
- healthy baseline: 15 minutes;
- recently changed/new/high-interest unit: 5 minutes for a bounded window;
- source instability/rate-limit: exponential backoff up to 60 minutes;
- customer-facing just-in-time check: immediate single-unit refresh, subject to source-health guardrails.

This cadence is a design target, not a production claim. Final intervals should be tuned from observed site behavior and source tolerance.

## Price Reaction Policy
A price change should be treated as a first-class event, not as an overwrite.

On observed price change:
1. preserve prior price and evidence;
2. record new price, timestamp, source hash, and source URL;
3. emit PRICE_CHANGED;
4. update the active normalized record only after the observation passes parser/source validation;
5. invalidate cached payment estimates tied to the old price;
6. recalculate customer match/payment estimates that depend on the changed price;
7. optionally flag active leads/shortlists whose fit materially improved or worsened because of the new price;
8. never claim a financing outcome or approval because price changed.

## Sold / Removal Reaction Policy
Because the dealership may mark vehicles sold quickly, the system must support both explicit sold signals and disappearance-based confirmation.

Priority order:
1. If the public source explicitly marks SOLD or unavailable, transition to SOLD_EXPLICIT immediately after source validation.
2. If a previously active VIN disappears from one healthy refresh, transition to MISSING_PENDING.
3. Recheck MISSING_PENDING units on an accelerated schedule.
4. If the unit remains absent through the configured confirmation window, transition to REMOVED_CONFIRMED.
5. If the unit reappears, emit VEHICLE_REAPPEARED and restore ACTIVE_CURRENT only after fresh validation.
6. SOURCE_ERROR or failed parsing never counts as evidence of sale/removal.

Recommended default confirmation behavior:
- first healthy miss: MISSING_PENDING;
- accelerated recheck within 5–15 minutes;
- additional healthy rechecks during the next 1–2 hours;
- REMOVED_CONFIRMED only after repeated healthy absence or explicit sold/unavailable evidence.

This is intentionally faster than a 24-hour assumption while still protecting against false SOLD states caused by transient site issues.

## State Change Events
Emit append-only events for:
- VEHICLE_FIRST_SEEN
- PRICE_CHANGED
- MSRP_CHANGED
- MILEAGE_CHANGED
- INCENTIVE_CHANGED
- AVAILABILITY_CHANGED
- VEHICLE_MISSING
- VEHICLE_SOLD_EXPLICIT
- VEHICLE_REMOVED_CONFIRMED
- VEHICLE_REAPPEARED
- SOURCE_PARSE_CHANGED
- SOURCE_ERROR
- SOURCE_BACKOFF_STARTED
- SOURCE_BACKOFF_ENDED

Each event should preserve observed timestamp, prior value, new value, source URL, source hash, and parser version.

## Matcher Contract
The matcher may consume only normalized records that meet its freshness policy.

Customer-facing match output should eventually distinguish:
- why the unit fits the customer's stated needs;
- which dealer-listed facts support that match;
- when the inventory record was last verified;
- whether availability requires confirmation;
- that payment estimates are estimates and not lender approval.

Before returning a vehicle as a high-confidence live match, the matcher should request a just-in-time freshness check when the current record is outside the configured recommendation freshness threshold.

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
F. Add adaptive refresh/backoff policy.
G. Add explicit sold detection + disappearance confirmation logic.
H. Add parser fixtures and mutation tests for missing/changed fields.
I. Replace hardcoded demo inventory behind a feature flag.
J. Run shadow comparison against public site before customer-visible activation.
K. Fail closed on stale/error states.
L. Only then allow active matching against live inventory.

## Acceptance Gates
- Same VIN does not duplicate across refreshes.
- Price/status changes are detected and history preserved.
- Price change invalidates stale payment/match calculations.
- Explicit SOLD/unavailable state is reflected quickly after validation.
- Missing fetch does not become false SOLD.
- Repeated healthy absence can confirm removal within a bounded window.
- Reappearing VIN restores only after fresh validation.
- Stale records are blocked from confirmed-availability recommendations.
- Parser changes fail closed rather than silently corrupting records.
- Source instability triggers backoff rather than request amplification.
- No PII enters analytics from inventory ingestion.
- Public source provenance is recoverable for every active record.

## Relationship to IgniAqua
This pipeline is a practical proving ground for:
- connector/evidence provenance;
- freshness qualification;
- adaptive state monitoring;
- state-change receipts;
- automotive Green Room training cases;
- Inventory Intelligence Specialist qualification;
- Vehicle Match Specialist evidence-backed recommendations.

This plan changes the inventory acquisition path only. It does not replace NorAutoMatch's existing matcher, CRM, Standard Retail / Vehicle Sourcing separation, or human dealership/F&I authority boundaries.
