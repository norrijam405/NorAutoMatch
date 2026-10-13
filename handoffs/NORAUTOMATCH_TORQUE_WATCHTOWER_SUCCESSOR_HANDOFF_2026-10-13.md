# NorAutoMatch Torque + Watchtower Successor Handoff — 2026-10-13

## Mission

Continue building the Torque / Watchtower / Vehicle Hunt / Industry Scout / Follow-up / CRM Bridge system from durable GitHub state.

Do **not** ask Norris to reconstruct preserved history. Read this handoff and the referenced files/commits first.

## Repository and branch

Repository: `norrijam405/NorAutoMatch`

Active feature branch:

`feature/2026-10-12-torque-inventory-matchdna-r0`

Current frozen branch head at handoff creation:

`cc629f9837b056cb234817b46c36769ce0797791`

Tree:

`40bdfbcd212a4995daec654bb9acb81d09cdbd36`

Latest commit:

`Test strong-fit follow-up preference disclosure`

Latest Torque Inventory R0 CI observed before handoff:

Run `38469461030` — **SUCCESS**

Head:

`cc629f9837b056cb234817b46c36769ce0797791`

The immediately preceding Torque CI runs were also green.

## Authority / safety

This work is feature development only.

**NO PRODUCTION AUTHORITY.**

Do not merge to main, deploy production, activate live paid providers, create paid infrastructure, expose secrets, or make destructive changes without separate owner authorization.

PASS does not imply deploy.

Customer-facing claims must remain evidence-bound. Never manufacture:
- vehicle availability;
- transfer authority or timing;
- reservation;
- financing approval or terms;
- price exceptions;
- customer contact;
- appointment;
- sale/lost state;
- delivery.

## Product direction

NorAutoMatch customer experience should stay simple.

Torque is the conversational intelligence layer.

MatchDNA is preference intelligence.

Vehicle Hunt is the canonical long-running customer vehicle search.

Watchtower is the restricted salesperson/operator command center.

Industry Scout watches verified automotive market changes.

Torque Follow-Up prepares useful text/email follow-up.

CRM Bridge keeps Torque provider-neutral so dealership CRMs can be integrated one at a time through bounded adapters.

Core product flow:

Customer request -> Torque Sales Inventory Spec -> Vehicle Hunt -> verified local inventory -> Orr network -> Nissan national discovery -> human verification where required -> follow-up -> authorized CRM synchronization.

## Completed work

### 1. Salesperson-grade Torque inventory parsing

File:

`src/lib/torque-sales-inventory-spec.ts`

Torque parses customer language into explicit inventory requirements including:
- make / model / year / trim;
- new / used / CPO;
- max price / mileage;
- exterior color;
- interior color;
- interior material;
- drivetrain;
- cab style;
- bed length;
- seating capacity / layout;
- engine / transmission / fuel type;
- towing / payload;
- packages;
- features;
- exclusions;
- requirement priority.

Examples covered:
- Baltic green/teal Pathfinder + brown/Chestnut seats + 4WD;
- Frontier King Cab + extended/6-foot bed.

Explicit customer requirements outrank inference.

### 2. Centralized matching truth

File:

`src/lib/vehicle-hunt-inventory-matcher.ts`

Public Torque and Watchtower now share one salesperson-grade match definition.

Supports:
- EXACT;
- STRONG;
- NEAR.

Wrong make/model identity is excluded from useful near matching.

Preferred trim can create a STRONG match instead of forcing sourcing when all hard requirements are satisfied.

Relevant hardening commits include:
- `0525fd2a` centralize matching;
- `5e195eeb` exclude wrong make/model;
- `89d13228` preserve preferred trim language;
- `420773d6` distinguish STRONG from NEAR;
- `85a18fe8` treat verified local strong fits as local Hunt matches;
- `5fde2fd5` disclose strong-fit preference differences in follow-up;
- `cc629f98` test strong-fit disclosure.

### 3. Public Torque chat

Files:

`src/components/torque/torque-chat.tsx`

`src/app/api/torque/search/route.ts`

Torque is mounted site-wide from `src/app/layout.tsx`.

Public behavior:
- conversational request input;
- no fake search on greetings/no criteria;
- verified inventory path where enabled;
- representative mode clearly separated;
- MatchDNA summary for signed-in customers;
- exact/near results;
- sourcing handoff when no exact local result;
- fail-closed if verified inventory source is unavailable.

Public Torque now uses the full normalized sales spec, not the earlier basic matcher.

### 4. Vehicle Hunt

Files:

`src/lib/vehicle-hunt.ts`

`src/lib/watchtower-persistence.ts`

Durable Hunt ID namespace:

`namvh_<24 hex>`

Vehicle Hunt preserves:
- workspace;
- opportunity link;
- user link;
- origin;
- state;
- exact customer request;
- normalized requirements;
- MatchDNA label;
- candidate VINs;
- preferred contact order;
- contact consent;
- salesperson owner;
- truth state.

Current state model includes:
- CAPTURING
- SEARCHING
- LOCAL_MATCH_FOUND
- NETWORK_MATCH_FOUND
- OUT_OF_NETWORK_MATCH_FOUND
- AWAITING_HUMAN_VERIFICATION
- CUSTOMER_REVIEW
- PAUSED
- CLOSED

### 5. Watchtower persistence schema

Migration:

`infrastructure/norautomatch-crm-v13-torque-hunts-scout-opportunities.sql`

Adds:
- `torque_vehicle_hunts`;
- `industry_scout_observations`;
- `scout_opportunity_matches`.

Create-only / bounded migration.

CI now executes and verifies the Watchtower migration using a PostgreSQL proof path.

Important commits:
- `78608007` repair/harden migration;
- `95448072` execute migration in CI;
- `9ebe2291` require executable migration verification;
- `532cf898` repair Torque CI and execute migration;
- `fbe49662` guarded v13 activation runbook;
- `16f466cd`, `70aea22c`, `d9ae2078` Watchtower persistence integration proof.

Do not assume production DB migration has been applied merely because CI proved it.

### 6. Restricted Torque Watchtower UI

Page:

`src/app/manager/watchtower/page.tsx`

Protected via:

`requireNorAutoMembership(["operator","admin","founder"])`

Current Watchtower includes:
- Fresh Up Hunt capture;
- active Vehicle Hunts;
- candidate counts;
- Hunt state;
- follow-up consent state;
- next-best action;
- verified inventory refresh;
- official Nissan nationwide search;
- residual requirements that still need manual verification;
- prepared follow-up draft;
- local/Orr/national inventory source registry;
- Industry Scout sources;
- salesperson Daily Brief;
- CRM Bridge readiness panel;
- truth-boundary explanations.

### 7. Fresh Up capture

Files:

`src/components/manager/fresh-up-hunt-form.tsx`

`src/app/manager/watchtower/actions.ts`

Operator can type natural language like:

“New 2026 Pathfinder, Baltic Teal, brown seats, 4WD. Platinum preferred. Under $55k.”

Watchtower persists it as a Vehicle Hunt.

The Hunt can then be refreshed against verified inventory.

### 8. Hunt inventory refresh

Action:

`refreshVehicleHunt`

Uses:
- `resolveInventoryRuntime`;
- `loadOrrResilientCustomerCatalog`;
- shared salesperson-grade matcher.

Verified live/cache only.

No silent fallback to demo inventory for operational Hunt refresh.

### 9. Public Torque -> consented sourcing -> CRM -> Vehicle Hunt

Lead schema now supports:
- optional `vehicleHuntId`;
- optional bounded `vehicleHuntRequest`.

Files:
- `src/lib/lead-schema.ts`
- `src/app/api/leads/route.ts`
- `src/components/matcher/lead-modal.tsx`
- `src/components/torque/torque-chat.tsx`

Flow:

Torque conversation
-> Start sourcing request
-> existing consented LeadModal
-> CRM opportunity persisted
-> Vehicle Hunt linked or created-and-linked
-> Watchtower sees same Hunt.

Truth states returned separately:
- NOT_REQUESTED
- LINKED
- CREATED_AND_LINKED
- LINK_FAILED_SAFE

If CRM lead save succeeds but Hunt linking fails, the system does not falsely report that the entire lead failed.

### 10. Hunt -> CRM opportunity association without duplicated PII

Functions in:

`src/lib/watchtower-persistence.ts`

Includes:
- `attachVehicleHuntToOpportunity`;
- `readVehicleHuntCustomerContext`.

Design rule:

Vehicle Hunt stores buying intent and sourcing intelligence.

CRM opportunity remains the canonical customer identity/contact record.

Do not duplicate customer name/email/phone into Hunt tables.

### 11. Torque follow-up

Files:
- `src/lib/torque-follow-up-plan.ts`
- `src/lib/torque-follow-up-draft.ts`

Preferred order:

TEXT -> EMAIL.

Reasons include:
- FIRST_CONTACT;
- NO_REPLY;
- EXACT_MATCH_FOUND;
- BETTER_MATCH_FOUND;
- PRICE_CHANGE;
- VEHICLE_STATUS_CHANGE;
- WATCHTOWER_NETWORK_MATCH;
- APPOINTMENT_REMINDER;
- POST_VISIT;
- CUSTOMER_REQUESTED_UPDATE.

Rule:

Every follow-up must add new information, answer a customer request, or advance a concrete next step.

No generic repeated “just checking in.”

Drafts remain:

`PREPARED_NOT_SENT`

and:

`DRAFT_ONLY`

Consent required.

STRONG matches disclose remaining preference differences rather than implying exact compliance.

### 12. Sourcing language

File:

`src/lib/torque-sourcing-language.ts`

Customer-facing Torque should not overemphasize holding location.

Classes:
- LOCAL_AVAILABLE;
- ORR_OKLAHOMA;
- ORR_OTHER_STATE;
- OUT_OF_NETWORK.

Rules:
- never say physically on-site when not;
- same-day transfer language only after human confirmation;
- do not promise transfer;
- out-of-network path should move customer toward comparable test drive + numbers + sourcing discussion;
- internal Watchtower may show store/VIN detail.

### 13. Next Best Action

File:

`src/lib/torque-next-best-action.ts`

Decisions include:
- REFRESH_VERIFIED_INVENTORY;
- VERIFY_WITH_MANAGER;
- PREPARE_TEXT;
- PREPARE_EMAIL;
- REVIEW_COMPARABLE;
- WAIT_FOR_CHANGE;
- NO_ACTION.

Watchtower displays priority and next action per Hunt.

No automatic send authority is granted.

### 14. Industry Scout

File:

`src/lib/industry-scout.ts`

Governed source classes:
- OEM_OFFICIAL;
- GOVERNMENT;
- INDUSTRY_DATA;
- TRADE_PRESS;
- DEALER_PUBLIC;
- SECONDARY_MEDIA.

Topics include:
- incentives;
- APR/lease;
- model launch/refresh;
- trim/feature changes;
- pricing;
- inventory/supply;
- sales volume;
- market share;
- consumer demand;
- EV/hybrid;
- recalls/safety;
- competitor moves;
- regulation;
- ownership cost.

Current source registry includes Nissan USA, Nissan newsroom, NHTSA, EPA, FuelEconomy.gov, Cox Automotive, J.D. Power, S&P Global Mobility, Automotive News.

Customer use requires primary/corroborated evidence where appropriate.

### 15. Scout -> opportunity matching

File:

`src/lib/scout-opportunity-matcher.ts`

Scout observations are scored against active Hunts.

Example:
verified Pathfinder incentive + Pathfinder Hunt -> actionable follow-up.

Unverified rumor -> NO_ACTION.

### 16. Salesperson Daily Brief

File:

`src/lib/salesperson-daily-brief.ts`

Watchtower summarizes:
- text now;
- email today;
- manager review;
- salesperson review;
- watch only;
- top actions.

Explicit truth state:

`NO_COMMUNICATION_WAS_SENT_BY_THIS_BRIEF`

### 17. Official Nissan national discovery

File:

`src/lib/nissan-national-search.ts`

Builds an official Nissan USA inventory search URL from verified supported parameters such as model/year/trim.

Residual requirements remain visible for manual verification.

Truth states:
- OFFICIAL_NISSAN_DISCOVERY_ONLY;
- availability NOT_PROVEN;
- transfer NOT_PROVEN.

Watchtower provides “Search Nissan nationwide.”

Do not pretend this is a fully automated machine-readable nationwide API yet.

### 18. Inventory source registry

File:

`src/lib/torque-inventory-sources.ts`

Scopes:
- LOCAL_STORE;
- ORR_GROUP;
- ORR_NISSAN_SIBLING;
- NISSAN_NATIONAL.

Includes Orr Nissan West, Orr Auto Group, sibling Nissan sources, Nissan USA national inventory, Nissan dealer locator.

The sibling registry is still partly static and should eventually be dynamically verified.

### 19. CRM Bridge provider-neutral contract

Files:
- `src/lib/dealership-crm-adapter.ts`
- `src/lib/torque-crm-sync-plan.ts`
- `src/lib/dealership-crm-runtime.ts`

Capabilities:
- CREATE_LEAD;
- UPDATE_LEAD;
- CREATE_NOTE;
- CREATE_TASK;
- READ_CUSTOMER;
- READ_LEAD;
- READ_TASK;
- READ_INVENTORY_REFERENCE;
- WRITE_HUNT_REFERENCE;
- WRITE_FOLLOW_UP_RESULT.

CRM runtime is fail-closed.

States:
- UNCONFIGURED;
- EVIDENCE_INCOMPLETE;
- CAPABILITY_CONFIG_INVALID;
- ADAPTER_NOT_IMPLEMENTED;
- READY_FOR_ADAPTER_BINDING.

Watchtower displays CRM Bridge status.

No provider adapter currently has write authority.

The actual Orr dealership CRM could not be verified from public evidence at handoff time. Do not guess.

### 20. CRM sync planning

File:

`src/lib/torque-crm-sync-plan.ts`

Creates bounded:
- Hunt note;
- follow-up task payload;
- idempotency key;
- required capabilities.

Truth fields:
- outboundExecution: NOT_PERFORMED;
- crmWriteState: NOT_WRITTEN;
- authorityEffect: NONE.

### 21. Operating doctrine preserved

File:

`docs/TORQUE_WATCHTOWER_OPERATING_SPEC_R0.md`

Read this before making architectural changes.

It preserves:
- truth hierarchy;
- sourcing language;
- MatchDNA precedence;
- Vehicle Hunt doctrine;
- Industry Scout rules;
- follow-up rules;
- CRM Bridge doctrine;
- public vs operator surface split;
- commercial module boundaries.

### 22. CI

Workflow:

`.github/workflows/norautomatch-torque-inventory-r0-ci.yml`

Covers:
- dependency audit recording;
- Torque behavior compile/execute;
- typecheck;
- production build;
- Watchtower migration/runtime proofs.

The repository still reports existing dependency vulnerabilities through npm audit. Do not hide or misrepresent them. The Torque workflow records the blocker while continuing targeted verification where configured.

At handoff creation, current branch head `cc629f98...` had a successful Torque Inventory R0 CI run.

## Existing repository systems reused

Do not duplicate these systems:
- CRM core/opportunities;
- follow-up obligations;
- conversation gateway;
- response preparation;
- response draft;
- manager handoffs;
- manager review receipts;
- CRM outbox;
- restricted intake-data detection;
- public abuse controls;
- inventory provider contract;
- Orr resilient inventory catalog.

Torque should extend these governed systems, not create parallel copies.

## User product intent

Norris wants:
- Torque to be genuinely useful on the dealership floor;
- minimal customer-facing emphasis on vehicle holding location;
- truthful sourcing language;
- same-day Oklahoma Orr transfer language only if verified;
- out-of-network path centered on comparable test drive, numbers, then sourcing;
- text first, email second;
- Industry Scout constantly tracking verified automotive market changes;
- eventual support for many dealership CRMs;
- eventual dealership licensing/commercialization.

Commercial product modules envisioned:
- Torque Core;
- Torque Hunt;
- MatchDNA;
- Watchtower;
- Industry Scout;
- Torque Follow-Up;
- CRM Bridge.

## Immediate successor priorities

1. **Start from exact current branch head `cc629f9837b056cb234817b46c36769ce0797791`.**
2. Re-run/reconcile current CI before material changes.
3. Read:
   - `docs/TORQUE_WATCHTOWER_OPERATING_SPEC_R0.md`
   - `src/app/manager/watchtower/page.tsx`
   - `src/lib/vehicle-hunt.ts`
   - `src/lib/vehicle-hunt-inventory-matcher.ts`
   - `src/lib/watchtower-persistence.ts`
   - `src/lib/torque-next-best-action.ts`
   - `src/lib/industry-scout.ts`
   - `src/lib/scout-opportunity-matcher.ts`
   - `src/lib/dealership-crm-runtime.ts`
4. Do **not** merge/deploy.
5. Continue toward:
   - durable production-safe Watchtower migration activation proof;
   - real Scout observation ingestion;
   - persisted Scout -> Hunt matching;
   - follow-up preparation from real CRM-linked customer context;
   - per-provider CRM adapter implementation after actual provider is known;
   - dynamic Orr/Nissan sibling discovery rather than static registry;
   - stronger nationwide new-Nissan machine-readable discovery if an official/stable path is verifiable;
   - Watchtower action controls that prepare CRM note/task packages without claiming execution.
6. Keep all customer-facing inventory/sourcing claims fail-closed.
7. Keep explicit customer requirements above MatchDNA inference.
8. Do not introduce new foundations unless needed to complete this loop.

## Expected future owner input

Do not ask immediately unless actually needed.

Likely owner input eventually required for:
- actual dealership CRM provider name;
- authorized API/integration access;
- CRM credentials or OAuth connection;
- production DB migration/deployment approval;
- any paid inventory/data provider decision;
- final production merge/deployment authority.

Until then, continue all bounded work that can be completed safely without those inputs.

## Continuity command for next agent

You are the NorAutoMatch Torque/Watchtower successor worker.

Repository:
`norrijam405/NorAutoMatch`

Branch:
`feature/2026-10-12-torque-inventory-matchdna-r0`

Begin with:
`handoffs/NORAUTOMATCH_TORQUE_WATCHTOWER_SUCCESSOR_HANDOFF_2026-10-13.md`

Freeze and verify the current branch head before material work.

At handoff creation:
`cc629f9837b056cb234817b46c36769ce0797791`

Do not ask Norris to reconstruct preserved history.

Continue autonomously until a real owner-only dependency is reached.

Maintain:

**NO PRODUCTION AUTHORITY**
