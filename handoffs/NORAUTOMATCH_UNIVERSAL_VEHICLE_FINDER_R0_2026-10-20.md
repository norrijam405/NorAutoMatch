# NorAutoMatch — Universal Vehicle Finder / Customer Fit Engine R0
Status: scoped design and build gate, NOT production activated.
Date: 2026-10-20

## User promise
Find the best vehicle for a customer's actual needs across all *authorized, verifiable* inventory sources, not simply the highest-priced vehicle or dealer's available stock. "Any car" means all makes/models may be researched and sourcing requested; it does NOT mean unauthorized access to other dealers' stock or guaranteed availability.

## Existing verified foundations (code inspection)
- Orr Nissan West source gate: dealer association 2175, full Algolia pagination, source integrity, normalized live vehicles; capped at 20 pages x 100 hits, failing closed if incomplete.
- Torque text-to-sales-spec with MUST_HAVE/PREFERRED, VIN and stock number exact identity.
- MatchDNA event summary and preference tie-breaker; must not override explicit hard requirements.
- Persisted Vehicle Hunt workflow and preview database save/reload independently checked in 2026-10.
- Nissan national discovery plan is a URL plus residual manual filters; never proof of available vehicle or authorized transfer.
- Irving Hyundai remains pending dealership confirmation; do not treat this as an integrated source.

## Next shippable milestone: Customer-to-Car Finder R0
1. Collect one vehicle brief: intended use (commute, family, hauling, accessibility, climate), maximum *out-the-door* budget where supplied, ownership cost concerns, geography/travel radius, new/used/CPO, and ranked non-negotiable vs flexible needs.
2. Normalize into one canonical query with explicit source/provenance for every requirement. Do not invent details, budget, financing approval, tow ratings, safety data or availability.
3. Query Orr West complete verified eligible inventory; produce exact/strong/near candidates and labeled gaps. Show checked-as-of time, source, dealership, pricing basis, stock/VIN and whether availability needs confirmation.
4. Rank only within fit classes: hard constraints first; preferred features, customer MatchDNA (opt-in), total-cost preference, proximity only where grounded. Provide WHY THIS FITS and WHAT IS UNVERIFIED for each.
5. If Orr inventory does not fit, create/save a Vehicle Hunt and offer verified external/OEM/public search links and a human sourcing path. External results must be labeled DISCOVERED_UNVERIFIED until independently checked; no transfer or availability claims.
6. Return a comparison and salesperson action: ask one decisive missing question; save shortlist with consent; obtain human verification; optional follow-up.

## Proposed next features, ordered
P0: Personal-use interview (commute/family/towing/accessibility), hard/soft requirement editor, affordability guard, source truth labels, complete inventory test.
P1: Cross-make compare matrix, real ownership cost and warranty/recall evidence (source-linked, effective-date checked), MatchDNA learning with user control, shareable shortlist.
P2: Authorized multi-source connector framework (OEM/public/partner/dealer-by-dealer), radius and transit logistics, lead-to-vehicle alerts triggered by price/inventory changes, trade-in and finance prequalification integrations with separate user consent.
P3: Salesperson CRM workflow, intelligent alternative explanations, family/household shared preferences, dealer-network transfer requests only with written partner authorization.

## Safety/operational gates
- No cross-dealer identity, lead, inventory or MatchDNA mixing. Check workspace authorization server-side.
- Never present demo/synthetic records as verified stock. No source data -> say not verified; keep Hunt active.
- No irreversible contact or financing action without user authorization and lawful opt-in.
- VIN/stock must resolve exact in a named authorized dealership source.
- Price is advertised, NOT out-the-door; taxes, fees, incentives and qualifications labeled separately.
- Avoid false mileage 0; verify feature/tow/seating evidence before asserting a must-have.
- No extra paid vendors/production rollout without explicit cost and production approval.

## Exit tests for next release candidate
A. Query >50 live eligible dealer vehicles without search truncation and validate complete source snapshot.
B. Hard budget, model, drivetrain, VIN, stock, mileage and exclusion requests cannot be promoted to EXACT when unknown or inconsistent.
C. MatchDNA personalization only changes ordering inside the same fit/compromise class; off/empty DNA baseline deterministic.
D. Bad/expired/incomplete source returns a truthful not-verified status; no fallback to demo under live mode.
E. No local match creates saved Hunt and persists after reload; confirmed dealership scope only.
F. Cross-dealer/customer unauthorized requests denied; consent false suppresses automated outreach.
G. Two candidates with similar cost get clear evidence-backed tradeoff explanation rather than invented ratings.

## Build order
Phase 1: implement standardized search result and source-confidence fields with regression harness.
Phase 2: customer needs interview and stable matching reason codes.
Phase 3: external discovery connectors under per-source authorization and verification.
Phase 4: end-to-end Watchtower + MatchDNA + customer site test; ship to Preview only, require explicit go/no-go for Production.
