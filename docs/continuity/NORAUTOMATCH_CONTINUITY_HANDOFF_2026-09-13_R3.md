# NorAutoMatch Continuity Handoff — 2026-09-13 R3

Status: CURRENT CONTINUITY / PRODUCT DIRECTION BANKED / NEXT BUILD AUTHORIZED
Canonical app branch at handoff: `reactivation/2026-09-08`
Canonical commit at handoff: `1c9161e6d1b86182cee556596c1262dc3c6522e8`
Render production service: `srv-dah04krl550s73d12v70`
Render workspace: TOAT workspace (`tea-dafqc3lg1s2s73fmorq0`)
Production URL: `https://norautomatch.onrender.com`
Latest verified deploy: `dep-dajmdl5g1s2s73baj5sg` — LIVE

## 1. Product state

NorAutoMatch has crossed from rough prototype into a product candidate with an approved visual direction and a working live-inventory path.

Approved design direction:
- premium automotive + controlled Trash Polka
- dark navy/black base
- warm white typography
- restrained amber/gold for actions and useful information
- crimson for expressive/discovery moments
- emerald reserved for verified/live/positive truth states
- mobile-first, highly distinctive, professional, personal, non-dealership-template feel
- hero is brand-neutral abstract automotive motion/headlight streaks; no visible competing vehicle brand
- headline remains `TELL ME THE NUMBER.`
- visual rhythm should alternate expressive and calm/trustworthy sections; do not overload one viewport with multiple expressive devices

User has explicitly approved this direction and considers the design production-worthy once the product behavior and inventory are hardened.

## 2. Live inventory breakthrough

The production inventory source was not dead. The system successfully pulled a fresh Orr Nissan West snapshot from the authorized dealer boundary (`dealer_id 2175`).

Observed production diagnostic:
- raw hits: 290
- normalized records: 286
- 2 inactive hits
- 2 `IDENTITY_INCOMPLETE` malformed rows
- 22 `STOCK_NUMBER_MISSING` warnings

The prior source gate rejected the entire inventory snapshot because two malformed records existed. This was too strict for a partial-data failure.

The gate was changed so a small, bounded number of `IDENTITY_INCOMPLETE` records can be quarantined without suppressing an otherwise healthy verified catalog. Systemic failures, dealer-boundary mismatch, incomplete snapshot, hit-count mismatch, zero inventory, duplicate/critical errors, and source-wide failure still fail closed.

This preserves the evidence-first / no-fake-inventory rule while allowing valid units to remain customer-visible.

## 3. Money / payment product rule — PERMANENT

User explicitly does not want NorAutoMatch to create a payment number that looks like a promise.

Permanent rule:

**NorAutoMatch may collect a shopper's payment comfort target as a matching/planning input, but it must not present a vehicle-specific monthly payment as fact unless the exact VIN, transaction assumptions, approved-credit/lender conditions, and required disclosures are explicitly established.**

Current implementation direction:
- shopper may state a monthly comfort target
- target can be used quietly to narrow the shopping field
- no bold vehicle-specific `~$X/mo` claims on live vehicle cards
- no implied approval
- no `you qualify for` language
- no fake APR or lender outcome
- live vehicle cards now suppress customer-facing payment quotes
- customer-facing pricing is currently subdued (`Current figures on request` / VIN-specific figures available when ready)
- money section is reframed as planning context, not financing result

If a payment estimate is ever shown later, it must be secondary and explicitly bound to assumptions including exact VIN/selling price, approved credit/lender terms, term, down payment, trade position, taxes, fees, incentives, optional products, and other deal-specific inputs.

## 4. Financing / credit application direction

User wants a financing path, but this must be treated as a higher-trust security/compliance surface.

Approved architecture direction:

Stage 1 — lightweight finance-interest entry:
- name
- phone/email
- preferred vehicle/VIN when selected
- rough down/trade context
- explicit statement that the shopper wants to discuss financing
- no SSN collection
- no hard credit pull
- no claim that an application has been submitted

Stage 2 — actual credit application:
- use a properly secured dealership/lender finance workflow
- explicit affirmative authorization before submission
- explicit consent before credit-report access / hard inquiry where applicable
- preserve consent receipt: timestamp, disclosure version, selected VIN/deal context, recipient route
- avoid storing SSNs or sensitive credit data inside NorAutoMatch unless a separately designed, secured, qualified surface is intentionally approved

Do not casually turn the current NorAutoMatch app into a homemade credit-bureau portal.

## 5. Inventory UX direction — NEXT PRODUCT LAYER

The homepage should NOT become a giant Cars.com-style catalog.

Approved architecture:

### Homepage inventory module
- compact interactive inventory window
- roughly 6–10 real verified vehicles
- horizontally swipeable / interactive
- visible actions such as `Browse all`, `Surprise me`, `Start SwipeMatch`
- positioned early enough to be discovered but small enough not to dominate the brand/product journey

### Full inventory page
Create a dedicated `/inventory` experience with:
- full verified catalog
- search/filter/sort
- real photos and verified vehicle facts
- clear freshness/provenance behavior
- source-neutral customer copy

Each vehicle should act as an entry point into the NorAutoMatch interaction model rather than a dead listing.

### Per-vehicle mini-games / interactions
When a shopper opens/selects a vehicle, offer product actions such as:
- `SwipeMatch from here`
- `Add to Garage`
- `Garage Battle`
- `Why does this fit me?`
- `Show me similar`

SwipeMatch should be able to seed from the selected vehicle and then surface nearby/related verified inventory.
Garage Battle should compare shortlisted units around the shopper's stated priorities, not declare an objective universal winner.
Match DNA should update only from observed likes/passes/preferences and must never claim learning that did not occur.

Product principle:

**The inventory page is not just a catalog. It is the game board.**

## 6. Homepage / flow cleanup already approved

Preserve these recent decisions:
- brand-neutral abstract hero; no random Mazda/competitor vehicle
- compact Match DNA presentation
- inventory unavailable/fallback state must visually match the new brand
- routine copy should not over-emphasize dealer ownership
- preferred brand positioning: `Independent. Human-guided. Built by someone who actually sells cars.`
- dealership identity should appear where transactionally relevant, not dominate the NorAuto brand
- customer-facing experience remains source-neutral; backend preserves exact source provenance

## 7. Current flow target

Customer journey:

`DISCOVER -> SHORTLIST -> COMPARE -> UNDERSTAND -> DECIDE -> ACT`

Desired product behavior:
- shopper quickly states comfort/preferences
- real verified inventory appears early
- SwipeMatch teaches the system preference signals
- likes enter Garage
- Match DNA explains what was actually learned
- Garage Battle compares shortlisted units around personal priorities
- finance remains subtle and planning-oriented
- customer can request test drive / Buyer Brief / sourcing / secure finance handoff only after the product has delivered value

## 8. Authority / truth boundaries

Do not weaken these:
- only authorized Orr Nissan West inventory source is currently customer-visible
- dealer boundary remains `2175`
- no fabricated availability
- no stale inventory presented as confirmed live
- no fake reservations
- no fake approvals
- no financing claims unsupported by actual lender/deal inputs
- do not infer sold from one failed fetch
- source/normalization failures fail closed when systemic
- management/F&I retain final authority over deal, finance, compliance and delivery
- capability does not imply authority

## 9. Render / deployment truth at handoff

Original production Render service remains the canonical one:
- URL: `https://norautomatch.onrender.com`
- service id: `srv-dah04krl550s73d12v70`
- branch: `reactivation/2026-09-08`
- workspace: TOAT workspace
- auto deploy: off

Latest money-policy revision commit:
`1c9161e6d1b86182cee556596c1262dc3c6522e8`

Latest verified Render deployment:
`dep-dajmdl5g1s2s73baj5sg`
Status at handoff: LIVE

A second newer Render workspace/service exists but is not the canonical deployment. Do not replace the original service without an explicit migration decision.

## 10. Next mission

Continue autonomously under existing IgniAqua evidence/authority/security rules.

Recommended next implementation sequence:
1. verify current live mobile + desktop experience after the money-policy revision
2. compact the homepage live inventory into a focused 6–10 vehicle interactive module
3. build dedicated `/inventory` page against existing verified catalog/runtime
4. add `Add to Garage` state and persistence model
5. implement vehicle-seeded SwipeMatch
6. implement Garage Battle using shopper-priority-weighted explanation
7. wire Match DNA to actual observed interaction state
8. design lightweight Stage-1 finance-interest flow with no SSN / no credit pull
9. separately design secure Stage-2 dealership/lender credit-application handoff with explicit consent receipts
10. paired user-live validation on phone + desktop before production-ready declaration

## 11. Production-ready gate

Do NOT call the entire product production-ready solely because the design looks finished.

Production-ready approval requires at minimum:
- verified inventory visibly and reliably renders
- mobile and desktop paired-test pass
- no misleading payment/finance claims
- critical action flows work
- inventory/interaction state behaves coherently
- finance/credit path preserves explicit authority and privacy boundaries
- no unresolved customer-facing truth or security blocker

## 12. Recent conversation tail (context only; canonical evidence outranks this)

User: approved brand-neutral abstract-motion hero and asked for continued autonomous work.
Assistant: deployed inventory diagnostics and discovered the catalog was being blocked by two malformed rows despite 286 valid units.
User: objected to bold payment estimates because real payment depends on credit, trade, down payment, VIN and deal structure; did not want the site to make them look dishonest.
Assistant: removed bold payment estimates, reframed the money lane as planning context, and deployed the revision.
User: proposed a secure financing-interest / credit-application path plus a compact interactive inventory module, a full inventory page, and mini-games launched from individual cars.
Assistant: accepted the architecture, separated low-risk finance interest from a high-trust credit application, and defined the inventory page as the game board.
User: asked that all of this be documented so the next agent can continue without reconstructing history.

End of handoff.
