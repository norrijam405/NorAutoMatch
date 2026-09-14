# NorAutoMatch — Chat Boundary Continuity Handoff R4

Date: 2026-09-14

## Purpose
This is the current chat-boundary delta for NorAutoMatch. It is not a replacement for IgniAqua institutional history, the Operating Kernel, constitutional/security law, prior proving receipts, or canonical source code. Incoming workers must reconcile this handoff against live GitHub + Render before material work.

## Founder operating directive
- Continue autonomously. Do not repeatedly ask permission for ordinary implementation/research.
- Stop only for genuine credential/external-access gates, billing/paid commitments, user-live/hardware requirements, consequential authority/business decisions, safety/legal boundary, or real blocker.
- Founder is not CI. Do not make him manually validate things that can be verified from tooling.
- Evidence-first, authority-bounded, verification-driven. No proof -> no claim of completion.

## Product identity / approved direction
NorAutoMatch is an independent, source-neutral automotive shopping and matching product. It is not supposed to feel like a dealer website or generic inventory marketplace.

Approved brand direction:
- Tagline: `CAR SHOPPING, WITHOUT THE PRESSURE`
- Hero phrase: `TELL ME THE NUMBER.`
- Premium automotive + controlled Trash Polka visual language.
- Dark navy/black base, warm white, restrained amber/gold, crimson for expressive discovery/competition, emerald reserved for verified/confirmed truth.
- Hero is brand-neutral abstract automotive motion/headlight-streak art. Do not reintroduce random branded hero cars.
- Product voice: professional, personable, distinctive, low-pressure, human-guided.

## Product composition decision — latest founder/agent agreement
The current product has strong individual features but too many were placed onstage at once. Simplify the experience into:

1. Homepage = sell the idea / tease capability.
   - Keep the approved hero.
   - Compact verified inventory teaser only (roughly 4–6 vehicles / horizontal rail on mobile).
   - Clear `Explore all inventory` doorway.

2. Inventory = find the car.
   - Natural-language search is the primary interaction.
   - Image-first cards.
   - Search/filter results only; do not let Garage Battle dominate this page.
   - Initial mobile view should stay compact (e.g. 12 + Show More, not 130-card scroll).

3. Vehicle interaction = contextual mini-games.
   - A vehicle card may open `SwipeMatch`, `Add to Garage`, `Battle`, `Why it fits`, `Show similar`.
   - Do not permanently render every game under every inventory list.

4. Garage = play with survivors.
   - Garage Battle, Match DNA, compare and shortlist reasoning belong primarily here.

5. Finance = intentional next step.
   - Finance-interest doorway is allowed.
   - Actual credit application / hard-pull flow remains a separate high-trust secure boundary.

Mental model: `FIND -> SAVE -> PLAY -> DECIDE`.

## Money / payment doctrine — permanent product rule
Founder explicitly rejected prominent vehicle-specific payment estimates because actual payments depend on exact deal structure.

Permanent rule:
> NorAutoMatch may collect a shopper's payment comfort target for matching, but must not present a vehicle-specific payment as fact unless the underlying VIN, transaction assumptions, credit/lender conditions, and required disclosures are explicitly established.

Do not show giant `$___/mo` claims.
No implied approval, APR, qualification, reservation, lender outcome, or payment promise.
A customer comfort target may quietly narrow the shopping field.
If any estimate is ever shown later, it must be secondary and explicitly assumption-bound to exact VIN/selling figures, approved credit/lender terms, term, down payment, trade position, taxes, fees, incentives, optional products, etc.

## Finance / credit architecture
Approved direction:
- Stage 1: low-sensitivity finance-interest / five-line start (name, contact, selected VIN if any, rough down/trade context, request to discuss financing).
- No SSN/DOB/hard-pull credentials in the current ordinary lead form.
- Stage 2: actual secure credit application only through a deliberately qualified secure dealership/lender workflow.
- Explicit affirmative authorization before credit report access/submission.
- Preserve consent receipt: timestamp, disclosure version, selected VIN/context, intended recipient route.
- Do not let NorAutoMatch become an ad-hoc sensitive-credit-data warehouse.

## Inventory authority / provenance
- Current authorized inventory source: `orrnissanwest.com` only, as founder-confirmed.
- Dealer boundary: dealer_id `2175`.
- Exact provenance must remain in backend even if customer-facing copy stays source-neutral.
- Never blend other dealers unless separately authorized.
- Fail closed on stale/unverified/systemic source failure.
- Do not fabricate availability, prices, features, vehicle identity or financing outcomes.

## Inventory breakthrough
The live Orr source was not dead. Production diagnostics observed:
- ~290 raw hits in the snapshot at the time of repair.
- 286 normalized cleanly.
- 2 inactive rows.
- 2 identity-incomplete rows.
- 22 stock-number warnings.

Previous gate incorrectly failed the entire catalog because two malformed rows existed. Gate was changed so a small bounded number of `IDENTITY_INCOMPLETE` rows may be quarantined while the rest of a complete verified catalog proceeds. Systemic failures still block.

## Live inventory / feature work already completed
- Source-provided vehicle photos were preserved for interactive inventory.
- Public feature fields were expanded/merged into searchable features, including source-supported `parsed_features`, `features`, `searchable_accessories` and related equipment/accessory data where supplied.
- Temporary feature diagnostics were removed after evidence was gathered.
- Live Render deployment last independently verified in this chat: commit `b27a42e59e8cd31785aa4bd1db0cf66e954ca25f` (`Remove temporary inventory feature diagnostics`) was LIVE on the original service.

Render source of truth:
- Workspace: `TOAT's workspace`
- Workspace ID: `tea-dafqc3lg1s2s73fmorq0`
- Service: original `norautomatch`
- Service ID: `srv-dah04krl550s73d12v70`
- URL: `https://norautomatch.onrender.com`
- New duplicate `Nor Auto Match` workspace/service created later is NOT the canonical deployed lineage unless founder explicitly changes that.

## Current GitHub truth at chat boundary
Canonical working branch:
`reactivation/2026-09-08`

Observed HEAD at final reconciliation:
`1c0c0521b81be2c90e9292381ffc2d6d6288d739`
message: `Remove accidental temporary marker`

Important distinction:
- GitHub canonical branch is 11 commits ahead of the last independently verified Render-live commit `b27a42e...`.
- Compare showed those later commits only materially add `docs/incidents/NORAUTO_TEMP_DIRECT_WRITE_2026-09-14.md` relative to the app code at `b27a42e...` (plus temp-marker history). Do NOT infer that canonical HEAD has been redeployed.
- Therefore use `MERGED/CANONICAL != DEPLOYED` discipline. Reconcile Render before claiming current HEAD is live.

## Current critical defect — natural-language inventory search
Founder user-live evidence says search is NOT acceptable yet.
Examples observed:
- searching `gun metal rogue` returned an unrelated red plug-in hybrid.
- searching `carplay` returned the same unrelated result.
- this is a hard production blocker for the inventory UX.

Likely product-level defect:
- Search/ranking is too loose and permits partial/fallback relevance to outrank exact required attributes.
- Natural-language search must parse meaningful constraints (model, color, drivetrain, features, condition, mileage, etc.) and distinguish required terms from optional/soft terms.

Required behavior:
- `gun metallic Rogue` should prioritize/require model Rogue + exterior color Gun Metallic where source evidence supports it.
- `CarPlay` should match vehicles whose source-supported feature set includes Apple CarPlay; if feature coverage is broad it should return many, not an arbitrary unrelated unit.
- `red Rogue AWD with CarPlay`:
  1. exact matches first;
  2. if none, explicitly label close matches and explain the missing attribute(s), e.g. `matches Rogue + AWD + CarPlay; color differs`;
  3. do not silently return an unrelated car as though it satisfies the query.
- Search should be deterministic/testable, not just a fuzzy keyword blob.
- Add behavior tests for representative queries before promotion.

Recommended search architecture:
- Build a normalized searchable vehicle document with authoritative source fields: year, make, model, trim, condition, exterior/interior color, drivetrain, body type, mileage, stock/VIN, and source-provided features/accessories/packages.
- Parse query into structured tokens/facets.
- Hard constraints for recognized identity/facet phrases; weighted ranking for soft/unrecognized terms.
- Exact -> close -> no-exact fallback with transparent explanation.
- Preserve source truth: never infer a feature that is not in the source data.

## Garage Battle — current critical product requirement
Founder says Garage Battle currently does not tell the useful lifestyle story.
It must NOT be a generic spec dump or universal `winner` system.

Required example logic:
- Rogue vs Kicks should explain that Rogue generally offers more cabin/cargo/family/travel utility, while Kicks may suit a smaller-footprint/city/easier-parking/value-oriented use case.
- Travel story should use evidence-supported fuel economy / cargo / seating / drivetrain / feature data where available.
- Do not invent measurements. If exact cargo/passenger data is unavailable from authorized inventory data, either use a clearly identified model-level trusted specification source later or keep the comparison qualitative and bounded.
- Tell the story around the shopper's priorities: family, commute, road trips, cargo, fuel economy, AWD/weather confidence, towing, parking footprint, performance, comfort, etc.
- `YOUR EDGE` may be personalized to user priorities; never claim an objective universal winner.
- Garage Battle should explain `why this matters to YOUR life`, not only `Vehicle A has X / Vehicle B has Y`.

## Match DNA requirement
Match DNA should eventually be computed from actual interaction state (likes, passes, saved vehicles, body-style/drivetrain/features, explicit needs), not decorative copy.
Never pretend the system learned a preference it has not observed.
Garage/Match DNA should persist across the shopper journey when the persistence design is qualified.

## Photography / visual inventory requirement
Desktop + mobile paired review found the inventory felt like a developer dashboard because cards were visually repetitive and weak.
Vehicle photography must carry the experience.
- Image-first cards.
- Strong hierarchy: vehicle identity + a few critical verified facts.
- Contextual actions, not 5 competing permanent buttons.
- No giant blank/dead zones for one-result/zero-result searches.
- If exact search returns zero, surface close matches with explanation rather than a dead-end black screen.

## Homepage / desktop-mobile review findings
Keep:
- Brand identity / hero.
- Search concept.
- Controlled Trash Polka visual language.
- Journey idea.
- Garage / SwipeMatch / Battle / Match DNA as product primitives.

Fix/simplify:
- Header should not consume excessive mobile working area on inventory page.
- Search/filter controls need compact mobile ergonomics.
- Inventory page should not become an endless card list.
- Garage Battle should move out of the primary search stream and into Garage/contextual play.
- Homepage inventory should be a teaser, not a catalog.

## Current production-readiness truth
Design direction: APPROVED.
Overall product: NOT YET production-ready.
Primary remaining blockers:
1. Natural-language search correctness and transparent exact/close-match behavior.
2. Garage Battle evidence-grounded lifestyle storytelling.
3. Inventory composition/photography/paging polish across desktop + mobile.
4. Confirm persistent Garage / Match DNA behavior if intended for launch.
5. Verify final customer-facing flow on real mobile + desktop after fixes.
6. Reconcile canonical GitHub SHA to exact Render deployed SHA before production-ready declaration.

## IgniAqua company status relevant to successor
Institutional Vault:
`norrijam405/IgniAqua-Institutional-Vault`

Vault `main` observed at this chat boundary:
`e33501871d787584ad3c6cee53b2e6a875d4d664`
Latest banked merge message:
`Merge pull request #39 ... Bank Security Fortress Green Room coverage receipt`

Do not use this NorAuto handoff as a shortcut around IgniAqua orientation. Incoming worker must start at Institutional Vault `START_HERE.md`, complete orientation/reconciliation, then read this handoff last.

Founder previously asked for an IgniAqua update. Current evidence in this chat supports only: institutional `main` remains at the Security Fortress Green Room coverage bank above; this chat materially advanced NorAutoMatch, not the IgniAqua core control-plane state. Do not invent additional IgniAqua progress.

## Exact next mission
1. Complete IgniAqua orientation + continuity reconciliation.
2. Reconcile live NorAuto GitHub `reactivation/2026-09-08` and Render original service.
3. Inspect current interactive inventory/search implementation before editing.
4. Write deterministic search behavior tests reproducing founder failures:
   - `gun metal rogue` / `gun metallic rogue`
   - `carplay`
   - `red rogue awd`
   - `rogue awd carplay`
   - a no-exact query that must yield labeled close matches.
5. Fix structured query parsing / ranking so recognized constraints cannot be silently violated.
6. Verify against the real verified catalog; no invented features.
7. Refactor inventory page composition to Find -> Save -> Play -> Decide.
8. Upgrade Garage Battle to evidence-grounded lifestyle storytelling.
9. Preserve money/credit/authority guardrails.
10. Deploy only after build/tests pass; paired-test mobile + desktop with founder.
11. Only after those gates, consider production-ready promotion.

## Recent conversation tail (context only, not canonical truth)
Founder: search is wrong (`gun metal rogue` and `carplay` return unrelated red plug-in hybrid); Garage Battle needs to tell lifestyle differences like Rogue space/travel utility vs Kicks compactness; asked for IgniAqua update.

Agent: agreed search is not true natural-language search yet and Garage Battle needs life-story reasoning; began reconciling search + IgniAqua state.

Founder at chat boundary: `we have reached the end of this chat. ... update everything and let me know what i need to tell the agent taking over for you?`

## Truth boundary
This handoff records observed source/runtime state and founder decisions as of 2026-09-14. Mutable GitHub/Render state may advance after this document. Incoming worker must reconcile before material work.
