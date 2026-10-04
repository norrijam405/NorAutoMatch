# Torque — NorAutoMatch Backstage Operating Report R0

Date: 2026-10-04

## Worker State

Worker: `Torque`  
Product: `NorAutoMatch`  
Role: `Backstage Automotive Operator`  
Mode: `MANUAL_SHADOW`  
Training: `ACTIVE`  
Customer Contact: `OFF`  
Production Writes: `OFF`  
Inventory QA: `ACTIVE`  
Automotive Research: `ACTIVE`  
Sales Training: `ACTIVE`  
BDC Training: `ACTIVE`  
Service Advisor Training: `ACTIVE`  
Evidence Logging: `ACTIVE`  
Autonomous Runtime: `NOT_PROVEN`

Status remains:

`GREEN_ROOM_TRAINING_ACTIVE`

No customer contact, pricing change, inventory mutation, credential change, deployment, production configuration change, financing action, or autonomous action was performed.

---

# Current NorAutoMatch Reconciliation

## Product

### VERIFIED

NorAutoMatch is an independent automotive research and vehicle-shopping product. It is not presented as the Orr Nissan West dealership website.

Current customer-facing product code includes:

- home inventory/SwipeMatch experience;
- full inventory playground;
- verified vehicle browse;
- VIN detail pages;
- natural-language inventory search;
- Garage saves;
- Match DNA behavioral signals;
- Garage Battle comparisons;
- account/login flows;
- finance-interest / bounded purchase-estimate surfaces;
- manager/lead/follow-up/appointment infrastructure.

Framework currently observed on canonical `main`:

- Next.js 16.3.8
- React 19.2.8
- TypeScript
- Supabase Auth / customer data
- PostgreSQL-backed governed CRM and inventory boundaries
- Render deployment surfaces

Canonical `main` at report time:

`71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`

## Inventory path

### VERIFIED

Current dealer source boundary is Orr Nissan West dealer association `2175`.

The public inventory reader obtains public Ridemotive/Algolia configuration from the Orr inventory page, then queries active dealer-associated inventory. It rejects incomplete snapshots and dealer-boundary violations.

Current customer inventory preference logic is:

1. eligible durable provider cache when available;
2. short-lived in-process verified live catalog;
3. bounded verified live Orr/Algolia read;
4. fail closed if verified real inventory is unavailable.

Demo inventory is not silently substituted into live customer mode.

### VERIFIED — current production limitation

Render service `norautomatch-live` is live, but current runtime logs repeatedly show:

`NORAUTO_INVENTORY_CACHE_BYPASS_TO_VERIFIED_LIVE INVENTORY_CACHE_DATABASE_UNAVAILABLE`

Therefore the durable R2 provider cache is not currently active for the live customer path.

PR #39 remains the active draft durable-cache candidate. Current observed PR head during this report:

`15ca730a685f7b52a09f6cbeaa3c739fbbed86a7`

The PR explicitly remains gated on private inventory-runtime credential activation and real cache sync/readback proof.

## Vehicle details

### VERIFIED

VIN detail requests independently refresh/read the verified Orr source snapshot, run the inventory source gate, normalize the dealer records, find the exact VIN, and refuse to construct detail claims from an unhealthy source snapshot.

The page displays source-provided price, mileage, drivetrain, colors, engine/transmission/fuel data, MPG, photos, incentives and features when supplied.

## Garage

### VERIFIED

Authenticated Garage saves persist in Supabase `saved_vehicles`.

The Garage also reads:

- inventory vehicle records;
- Match DNA events;
- Market Scout jobs;
- vehicle Scout dossiers.

Unsigned users can keep vehicles for the current session from inventory/SwipeMatch; authenticated users can persist saves to the Garage.

## Comparison

### VERIFIED

The current interactive comparison surface is `Garage Battle`.

It can compare dealer-supported facts such as:

- advertised price;
- drivetrain;
- city/highway MPG.

Manufacturer-spec enrichment is intentionally narrow.

At report time the hard-coded manufacturer specification set covers only:

- 2025 Nissan Rogue
- 2025 Nissan Kicks
- 2026 Nissan Rogue
- 2026 Nissan Kicks

for selected dimensions/cargo/seating facts.

---

# First Backstage Inspection

## Observation 1 — Shopper taxonomy can disagree with source taxonomy

Truth state: `VERIFIED`

### OBSERVATION

The current Orr Nissan West page for a 2026 Nissan Kicks SV identifies its body type as:

`Station Wagon`

VIN observed:

`3N8AP6CB9TL424112`

The current NorAutoMatch normalizer intentionally preserves the source category/body subtype and the inventory UI uses that value as the customer-facing body-type filter.

### EVIDENCE

- Orr Nissan West 2026 Kicks SV VDP, crawled 2026-10-04/within recent days, reports Body Type = Station Wagon.
- `src/lib/orr-algolia-normalizer.ts` assigns:
  `bodyType: hit.category ?? hit.body_subtype`
- `src/components/inventory/interactive-inventory.tsx` generates body filters directly from `vehicle.type`.

### CUSTOMER IMPACT

A shopper who says "SUV" or selects an SUV filter may reasonably expect Kicks inventory to appear. If the provider categorizes it as Station Wagon, preserving that literal taxonomy may make a legitimate crossover harder to discover.

This is not evidence corruption. It is a distinction between provider taxonomy and shopper taxonomy.

### RECOMMENDED ACTION

Preserve the provider's original body classification as evidence, but add a separate shopper-facing normalized segment/category layer.

Example:

- sourceBodyType: `Station Wagon`
- shopperBodyType: `SUV / Crossover`

Any mapping should be model-year/source-backed and auditable rather than silently overwriting the source value.

### AUTHORITY REQUIRED

Another NorAutoMatch product worker can safely design/test this as ordinary reversible code work.

No Norris/production authority is required until promotion.

---

## Observation 2 — Price data changes fast enough that freshness is a sales requirement

Truth state: `VERIFIED`

### OBSERVATION

The same current-stock 2026 Nissan Armada PRO-4X, VIN:

`JN8AY3DB2T9121711`

appeared in recent Orr web evidence at materially different advertised prices across crawls.

One VDP crawl showed Y'ORR Price:

`$76,832`

A newer inventory result showed:

`$73,332`

The dealer page also separates MSRP, dealer discount, incentives and a $699 document fee.

### EVIDENCE

Recent public Orr Nissan West indexed pages for the same VIN show the price movement.

NorAutoMatch currently selects:

`hit.price` first, then `hit.functional_price`

and presents the result as an advertised source price, while explicitly warning that it is not an out-the-door quote or financing promise.

### CUSTOMER IMPACT

Sales/BDC conversations built from yesterday's price can become wrong quickly.

A shopper may also misunderstand whether a displayed amount includes dealer discount, conditional incentives, document fee, or other components if NorAutoMatch only surfaces a single number.

### RECOMMENDED ACTION

Keep current freshness/source timestamp visible and add structured price evidence when the provider supplies it:

- source advertised price;
- MSRP/market price;
- unconditional dealer discount;
- document fee;
- conditional incentives separately labeled;
- timestamp.

Never automatically treat conditional college/military/loyalty programs as universally available.

### AUTHORITY REQUIRED

Research/data/UI worker can prepare the model and tests.

Production pricing presentation should receive compliance/product review before promotion.

---

## Observation 3 — Current comparison knowledge is too narrow for a real salesperson

Truth state: `VERIFIED`

### OBSERVATION

Garage Battle has strong evidence discipline but manufacturer-backed comparison enrichment is limited to four Nissan model-year entries: 2025/2026 Rogue and Kicks.

Meanwhile current dealer inventory already contains later/current vehicles such as 2027 Murano and 2027 Frontier.

Current Nissan USA comparison material also treats vehicles such as these as direct competitive sets:

- Rogue vs Honda CR-V / Toyota RAV4 / Ford Escape / Mazda CX-5;
- Frontier vs Toyota Tacoma;
- Pathfinder vs Honda Pilot / Ford Explorer / Chevrolet Traverse.

### EVIDENCE

- `src/lib/garage-battle.ts` MODEL_SPECS table.
- Current Orr Nissan West inventory pages.
- Current Nissan USA comparison/specification pages.

### CUSTOMER IMPACT

Torque cannot yet support a salesperson-level comparison conversation across the real floor.

A customer asking "Why this Rogue over a CR-V?" or "Frontier vs Tacoma?" needs current, trim-aware, sourced answers—not generic Nissan talking points.

### RECOMMENDED ACTION

Create a provider-neutral comparison evidence library with model-year bounded records for the highest-frequency competitive pairs.

First tranche:

1. Rogue vs CR-V / RAV4
2. Frontier vs Tacoma
3. Pathfinder vs Pilot
4. Armada vs Sequoia
5. Sentra vs Civic / Corolla
6. Murano vs Passport

Store exact source provenance and effective model year.

### AUTHORITY REQUIRED

Torque can research and prepare evidence in MANUAL_SHADOW.

Another software worker can implement storage/UI.

No production authority needed for research.

---

## Observation 4 — Service-advisor value is largely absent from the current customer product

Truth state: `VERIFIED`

### OBSERVATION

Current repository reconnaissance found no dedicated customer surface for:

- maintenance schedules;
- recall lookup/research;
- service-intake clarification;
- warranty research;
- ownership/service education.

These are stated NorAutoMatch product goals but are not presently represented as major `src/app` customer routes.

### EVIDENCE

Current `src/app` route inventory and repository search during this report.

### CUSTOMER IMPACT

NorAutoMatch currently helps primarily during shopping and Garage research.

It does not yet meaningfully support the ownership/service side of the customer lifecycle. That leaves value on the table after a vehicle is saved or purchased and limits Torque's ability to act as a useful backstage service-research operator.

### RECOMMENDED ACTION

Do not start by building an automated service advisor.

Start with a read-only `Ownership Desk` concept:

- VIN/model-year maintenance research;
- official recall lookup links/evidence;
- service-history questions customers should be ready to answer;
- common maintenance explanations;
- "what we know / what requires technician diagnosis" boundary;
- service appointment preparation.

### AUTHORITY REQUIRED

Torque may research and draft.

Software implementation can be assigned separately.

Legal/compliance review should occur before presenting warranty or safety claims as customer guidance.

---

## Observation 5 — Current cache fallback is safe, but operationally fragile

Truth state: `VERIFIED`

### OBSERVATION

The live service is successfully starting and serving the application, but the durable inventory database is unavailable to the live runtime. Every observed cache attempt falls through to verified live Orr inventory.

### EVIDENCE

Render `norautomatch-live` logs on 2026-10-04 show successful build/start followed by repeated:

`NORAUTO_INVENTORY_CACHE_BYPASS_TO_VERIFIED_LIVE INVENTORY_CACHE_DATABASE_UNAVAILABLE`

PR #39 records the unfinished credential/runtime proof gate.

### CUSTOMER IMPACT

Current behavior preserves truth, which is good.

But customer inventory availability remains more dependent on the live external provider path than intended. If the provider becomes slow/unavailable, NorAutoMatch can correctly fail closed but may temporarily lose the customer inventory experience.

### RECOMMENDED ACTION

Complete the already-defined R2 runtime credential/sync/readback lane rather than designing another cache/orchestrator.

After activation, prove:

- real Orr sync;
- source hash/timestamp provenance;
- cache-first healthy read;
- stale-cache rejection;
- verified-live fallback;
- no demonstration fallback.

### AUTHORITY REQUIRED

`NORRIS_REQUIRED` at the private credential activation step.

Torque may observe/report but may not activate credentials or change production configuration.

---

# Additional Evidence / Watch Item

Truth state: `UNVERIFIED CURRENT` / `VERIFIED HISTORICAL TEST RESULT`

A Render showcase smoke run on 2026-10-03 received HTTP 429 on all tested routes, including home, inventory, API inventory, vehicles, login, account, Garage and manager.

This does not establish that customers currently receive 429 responses. It may reflect smoke-run source/network rate controls.

Recommendation: perform a bounded current customer-path browser check from a normal external client before treating this as a product defect.

No production mutation is justified from this evidence alone.

---

# Major Current Competitive Context Learned

## VERIFIED

Local Nissan-shopping competition around Oklahoma City includes at least:

- Orr Nissan Central
- Orr Nissan East
- Bob Howard Nissan
- Bob Moore Nissan of Norman

Broader model competition is not limited to Nissan dealers. Current official Nissan comparison materials directly position:

- Rogue against CR-V, RAV4, Escape, CX-5 and Equinox;
- Frontier against Tacoma;
- Pathfinder against Pilot, Explorer and Traverse.

Torque should learn competitors at the vehicle/trim/use-case level rather than memorizing dealership names only.

---

# Torque Training Assessment

## Demonstrated

### VERIFIED

Torque has now demonstrated:

- repository/product reconnaissance;
- inventory lineage understanding;
- distinction between dealer evidence and shopper interpretation;
- current inventory QA reasoning;
- price-freshness awareness;
- comparison-gap identification;
- service-product gap identification;
- production-boundary recognition;
- evidence-state labeling;
- actionable backstage reporting without production mutation.

## Not Yet Demonstrated

### VERIFIED

Torque has not yet demonstrated proficiency in:

- live sales needs analysis;
- objection handling;
- dealership phone handling;
- BDC appointment setting;
- lost-lead recovery;
- CRM note quality;
- trade/payment conversations;
- service write-up interviewing;
- maintenance recommendation explanation;
- recall/warranty research under time pressure;
- upset-customer handling;
- real competitive walkarounds.

Therefore training status remains:

`GREEN_ROOM_TRAINING_ACTIVE`

No dealership-operator proficiency claim is authorized.

---

# Recommended Next Field Assignments

## Assignment 1 — Sales

Run 10 scored customer-needs simulations using current Nissan/Orr inventory.

Required competencies:

- discovery;
- vehicle selection;
- feature-to-benefit explanation;
- competitor awareness;
- objection handling;
- truthful price/availability language;
- next-step control.

## Assignment 2 — BDC

Run 10 mixed lead scenarios:

- fresh internet lead;
- price-only lead;
- no-response lead;
- no-show;
- trade lead;
- credit concern;
- unavailable vehicle;
- used-car inquiry;
- service-to-sales opportunity;
- returning shopper.

Torque drafts only. Customer contact remains OFF.

## Assignment 3 — Service

Run 10 service intake scenarios covering:

- maintenance;
- brakes;
- tires;
- warning lights;
- recall question;
- warranty question;
- noise/vibration concern;
- prior failed repair;
- high estimate;
- angry customer.

Torque must distinguish customer-stated symptoms from diagnosis.

---

# Best Immediate Product Assignment

Build the specification for:

`SHOPPER_FACING_BODY_CLASSIFICATION_R0`

Goal:

Preserve exact provider body taxonomy while adding a separate shopper-friendly category so vehicles such as Kicks remain discoverable in the categories customers actually use.

Do not change production inventory records in this training lane.


---

# Dealership Training Advancement — 2026-10-04

## Overall Result

`TORQUE_DEALERSHIP_OPERATOR_R0 — PROVISIONAL_PASS`

Torque completed controlled Green Room role-play across sales, trade, credit, BDC, vehicle matching, appointment setting, and basic service-response boundaries.

This is **not** a live-customer certification.

## Demonstrated in Role-Play

- calm objection handling under pressure;
- payment-objection discovery without promising unapproved terms;
- trade handling without inventing appraisal values;
- credit-fundamentals handling without promising lender approval;
- recognition that lender/desk outcomes must be verified before customer-facing claims;
- needs analysis using customer hot buttons rather than scripted product dumping;
- BDC qualification, follow-up-channel preference, remote-shopping friction removal, and appointment setting;
- vehicle matching based on real use case, including towing, cargo, comfort, family needs, and long-distance travel;
- interest-rate questions handled without inventing customer-specific APR;
- explicit willingness to say `UNKNOWN` and obtain the right answer instead of bluffing.

## Norris Coaching Incorporated

Primary coaching point:

> Listen for the small clues early.

Signals such as prior lenders, credit comments, family changes, current payment, outside trade offers, work use, towing, cargo requirements, back comfort, and preferred communication channel can materially change the correct sales or BDC path.

Torque should treat these as customer hot buttons and update discovery accordingly.

## Training Status

- `AUTO-SALES-TRAINING-R0 — PASS`
- `AUTO-BDC-TRAINING-R0 — PASS`
- `AUTO-CREDIT-FUNDAMENTALS-R0 — PASS`
- `AUTO-TRADE-FUNDAMENTALS-R0 — PASS`
- `AUTO-NEEDS-ANALYSIS-R0 — PASS`
- `AUTO-SERVICE-BASIC-R0 — SUFFICIENT_FOR_SIMPLE_FIRST_RESPONSE`

Overall worker state becomes:

- Training: `ACTIVE — ADVANCED`
- Customer Contact: `OFF`
- Production Writes: `OFF`
- Autonomous Runtime: `NOT_PROVEN`
- Backstage Research: `AUTHORIZED`
- Lead Analysis: `AUTHORIZED`
- Response Drafting: `AUTHORIZED`
- Vehicle Matching: `AUTHORIZED`
- Inventory QA: `AUTHORIZED`

## Current Authority Boundary

Torque may research, analyze, prepare, recommend, compare, detect, draft, and report.

Torque may **not** independently:

- contact customers;
- alter customer records;
- promise approvals, APRs, incentives, pricing, or availability;
- change inventory;
- change production configuration;
- approve financing;
- make binding legal/compliance representations;
- deploy or merge production changes.

## First Backstage Work Queue

### 1. Lead Intelligence Prep

For new or active NorAutoMatch leads, prepare a backstage brief containing:

- stated vehicle interest;
- hot buttons;
- likely objections;
- trade/credit signals;
- preferred communication channel;
- missing information;
- recommended next question;
- truth-state labels for material claims.

No outbound contact.

### 2. Vehicle Match Prep

Given a shopper need, prepare 2–5 candidate vehicles using current verified inventory and source-backed specs.

Include:

- why each candidate fits;
- material compromises;
- current availability truth state;
- price freshness/source time;
- unresolved facts requiring verification.

### 3. Inventory / Shopper QA

Continue backstage checks for:

- stale listings;
- suspicious pricing;
- missing/bad photos;
- duplicate listings;
- shopper-facing taxonomy problems;
- inconsistent specs;
- weak comparison coverage;
- customer-path friction.

### 4. BDC Follow-Up Drafting

Prepare text/email/call-outline drafts only after the lead context is known.

Respect:

- channel preference;
- next-contact timing;
- appointment status;
- whether the customer requested remote handling or delivery;
- no invented availability, financing, trade, or pricing claims.

### 5. Credit / Trade Preparation

For credit or trade-sensitive leads, summarize what is known, what is missing, and what the desk/lender/appraisal process must determine.

Never represent a desk estimate as a lender approval or an appraisal guess as a verified trade value.

## Advancement Rule

Torque remains backstage until real supervised work demonstrates that the role-play skills transfer to live dealership conditions.

Next advancement evidence should come from **actual bounded work samples**, not more generic classroom drills.
