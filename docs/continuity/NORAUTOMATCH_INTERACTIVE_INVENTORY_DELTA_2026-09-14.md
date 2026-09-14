# NorAutoMatch Interactive Inventory Continuity Delta — 2026-09-14

## Purpose
This delta records the product/implementation state after paired mobile/desktop review, live Orr inventory recovery, payment-claim hardening, and the first interactive inventory product pass. It is a delta, not a replacement for IgniAqua institutional history or prior NorAutoMatch handoffs.

## Canonical runtime
- Repository: `norrijam405/NorAutoMatch`
- Canonical Render branch: `reactivation/2026-09-08`
- Canonical commit at this boundary: `b27a42e59e8cd31785aa4bd1db0cf66e954ca25f`
- Production Render service: `srv-dah04krl550s73d12v70`
- Production URL: `https://norautomatch.onrender.com`
- Render workspace: TOAT's workspace (`tea-dafqc3lg1s2s73fmorq0`)
- AutoDeploy remains off; production promotion is explicit.

## Design state
APPROVED DIRECTION.

The customer-facing visual direction is Premium Automotive × Controlled Trash Polka:
- dark premium foundation,
- red expressive accents,
- restrained amber/gold for useful actions/context,
- emerald reserved for verified/positive truth,
- brand-neutral abstract motion/headlight hero,
- no accidental Mazda/Ford/Nissan hero vehicle branding,
- mobile-first compact pacing.

The homepage no longer needs a large catalog wall. It now contains a compact verified inventory spotlight with a horizontal mobile rail and paths into the full inventory experience.

## Inventory truth state
The live source is Orr Nissan West public inventory only, dealer boundary `2175`.

Recent production evidence established approximately 290 raw source hits and 286 normalized usable records, with bounded malformed/inactive source rows excluded instead of blocking the entire healthy catalog. Dealer-boundary, snapshot-completeness, hit-count, zero-inventory, systemic-normalization, freshness, and match-eligibility gates remain fail-closed.

Do not blend other dealers into this catalog unless separately authorized.

## Search/product upgrade
A full `/inventory` route exists and is customer-facing when the live source passes verification.

`InteractiveInventory` currently provides:
- natural-language/token search over verified source attributes,
- examples such as `red Rogue AWD`, `CarPlay SUV`, and `black Frontier 4x4`,
- body-style chips,
- smart feature chips,
- color aliases,
- drivetrain aliases,
- 12-unit progressive display with Show More rather than an endless mobile wall,
- session shortlist / Your Garage,
- two-car Garage Battle,
- mini SwipeMatch seeded from any inventory unit,
- bounded finance-interest next step.

The source exposes feature-bearing fields including `parsed_features`, `features`, `searchable_accessories`, `accessories`, `accessory_package`, `floor_plan_features`, and `equipment_groups`. All 286 normalized records observed in diagnostics carried normalized feature data.

Normalizer parser version `orr-algolia-v5` now merges public string-capable feature/accessory fields into the verified vehicle feature set, deduplicated without inventing missing equipment. This was added specifically to improve natural-language searches such as `carplay`.

Temporary feature-schema diagnostics were removed after verification to avoid production log spam.

## Homepage inventory architecture
Homepage uses `HomeInventorySpotlight` rather than rendering the entire live matcher/catalog.

Behavior:
- shows up to 8 verified units in a horizontal mobile rail,
- shows verified source count/timestamp,
- hides vehicle/payment price promises,
- routes to `/inventory` for full search/play,
- includes Search all inventory, Start SwipeMatch, and Open inventory playground entry points,
- fails closed to a compact verification state if live inventory cannot be trusted.

The full catalog remains one click away and is the proper place for search, Garage, Battle, SwipeMatch, and finance interest.

## Permanent money / financing rule
Customer payment comfort is a planning input, not a NorAutoMatch promise.

NorAutoMatch must not present a vehicle-specific payment as fact unless the exact VIN/deal structure and required assumptions/approved terms are established and disclosed. Do not present implied approval, APR, qualification, reservation, or lender outcome.

Live inventory cards intentionally use wording such as VIN-specific/current figures available when ready rather than bold monthly-payment claims.

A `FinanceInterestModal` exists as a LOW-SENSITIVITY interest gate only:
- selected vehicle/VIN,
- first/last name,
- email,
- phone,
- contact consent.

It explicitly does NOT collect SSN, DOB, income, banking data, an actual credit application, or authorization for a credit inquiry. A real credit application/hard-pull authorization must remain a separate secure, deliberately qualified workflow/provider handoff.

## Next product work
1. USER-LIVE paired-test natural-language feature search after parser v5: `carplay`, `red rogue awd`, and at least one multi-feature combination.
2. If source-supported queries behave correctly, bank that as customer-visible search PASS.
3. Persist non-sensitive Garage / Swipe preference state across navigation/session (prefer client-side/local persistence first unless a justified backend need appears).
4. Convert observed likes/passes/shortlists into truthful Match DNA signals; never claim learning that was not observed.
5. Upgrade Garage Battle to explain tradeoffs against observed shopper priorities, not declare a universal winner.
6. Make homepage Start SwipeMatch deep-link into an active inventory play mode rather than only the inventory landing page.
7. Continue mobile/desktop polish from paired testing without redesigning the approved visual system.
8. Keep finance interest separate from any real credit application until security/compliance architecture is explicitly qualified.

## Current launch boundary
- Visual direction: APPROVED.
- Production runtime: LIVE / healthy at last verified deploy before this documentation commit.
- Live inventory source: working under verification gates.
- Interactive inventory page: implemented.
- Natural-language feature search: code promoted; final customer-visible paired test still required before calling fully verified.
- Actual secure credit application: NOT IMPLEMENTED / NOT AUTHORIZED as part of current low-sensitivity surface.
- Overall production-ready stamp: still requires final paired customer-visible inventory/search verification plus remaining product polish.

## Recent conversation tail (context, not canonical evidence)
User: wants NorAutoMatch to remain distinctly professional/personable/different, likes the approved mobile direction, dislikes long catalog walls, and specifically wants Orr-style simple search where `red Rogue AWD` or feature requests can be typed directly. User also wants inventory units to open mini versions of SwipeMatch/Garage/Garage Battle and eventually feed Match DNA. User wants finance application interest available but does not want NorAutoMatch making misleading payment claims.

Assistant execution: compacted homepage inventory, preserved full `/inventory` playground, identified public source feature/accessory fields, merged those source-supported strings into search, maintained fail-closed source truth, and kept the finance doorway below the sensitive credit-application boundary.
