# NorAutoMatch R1 Continuity Handoff — 2026-09-16

Truth basis: current NorAutoMatch repository state, public Render verification, current PR #30 metadata, and the latest user-live conversation.

## Root operating rules
- Follow IgniAqua evidence-first, authority-bounded, verification-driven doctrine.
- Canonical repository evidence outranks chat summaries.
- Do not make the user CI.
- Continue autonomously until a real credential/external-access gate, billing/paid commitment, consequential authority/business decision, hardware/user-live step, safety boundary, or genuine blocker.
- Branch/merge != deploy; deploy != customer-live.
- Never claim a human user-live PASS without actual human confirmation evidence.
- Preserve failures and corrections rather than overwriting history.

## Active repository / release line
Repository: `norrijam405/NorAutoMatch`

Active branch: `feature/2026-09-15-supabase-auth-r1`

Canonical historical base: `reactivation/2026-09-08`

Draft PR: #30 — `Close NorAutoMatch R1 showcase, auth, inventory and brand hardening`

At handoff creation, PR #30 was open, draft, mergeable, and intentionally unmerged pending the remaining human auth persistence proof.

## Public showcase
Public URL: https://norautomatch-live.onrender.com/

Confirmed Render workspace: `Nor Auto Match`
Workspace id: `tea-dajgei7qj5pc73dhhrh0`

Public service id: `srv-dakr4qlbedkc73c75pi0`
Validator service id: `srv-dakqdc7f3r2c73du8g00`
Public smoke service id: `srv-dakrekfqj5pc73crbfo0`

Do NOT operate the TOAT Render workspace for NorAutoMatch.

Latest live customer-facing code verified on Render before receipt-only commits: `e78802ec06b194c05e1e6e4c835cd1edf3c57145`.

Latest branch head after refreshing release/auth receipts: `ae14b01b217643040ca472e69d7db4e4ec68e24c` at the time PR #30 metadata was refreshed.

## Current customer-facing truth
NorAutoMatch R1 is PUBLIC SHOWCASE LIVE / OUTSIDE-IN VERIFIED / DEMO-READY.

Current verified public behavior includes:
- homepage 200
- inventory 200
- inventory API 200
- vehicles 200
- login 200
- unauthenticated account/garage/manager redirect to login
- Live SwipeMatch
- Full details -> exact VIN page
- Garage discoverable in the main customer journey
- Sign in discoverable in the header
- NAM brand badge present
- NorAuto Match brand identity present
- distinct Sign in and Create account modes
- one primary submit action per auth mode
- resend-confirmation recovery present
- protected route boundaries remain intact

## User-live auth state
The user personally tested the prior login/signup flow and exposed real UX defects:
- login was too hard to find
- Sign in vs Create account was ambiguous
- multiple things looked like buttons without clear behavior
- two different emails were tried because the auth state/next step was unclear

Those problems were corrected afterward:
- visible Sign in in header
- Garage in primary navigation
- clear mobile auth entry
- Sign in and Create account split into distinct modes
- explicit signup confirmation instructions
- explicit unconfirmed-email handling
- resend-confirmation recovery
- confirmation callback supports PKCE auth-code and token-hash confirmation flows
- public smoke now gates auth discoverability and brand placement

At the latest conversation, the user said: "Everything is good so far and i think the website looks amazing even on mobile."

Do NOT promote that statement into full auth USER-LIVE PASS unless the following exact human flow is confirmed:
`Create account -> receive email -> confirm -> sign in -> open Garage -> save vehicle -> sign out -> sign back in -> verify saved vehicle persists`.

This is the remaining meaningful R1 human gate.

## Inventory truth
Orr Nissan West public inventory uses Ridemotive -> Algolia.

Store association semantics: active records whose `dealer_ids` contains `2175`.

Do not use primary `dealer_id == 2175` as the store boundary; that undercounts associated/sellable units.

In-transit units are sellable/reservable and must NOT be automatically excluded.

Latest hardened smoke observed approximately:
- active Orr-associated source units: 405
- normalized/customer-usable: 398
- quarantined structured rows: 7
- in-transit included: 15
- usable vehicles with HTTP/Ridemotive photos: 395 / 398 (~99.25%)

Counts drift naturally with live inventory. Never interpret ordinary source drift as data loss without evidence.

Seven incomplete source rows are quarantined rather than misrepresented as nonexistent. Typical causes were missing positive structured price or incomplete structured identity.

## Photo architecture
Ridemotive `images[]` values are opaque IDs, not URLs.

Correct CDN expansion:
`https://images.app.ridemotive.com/<image-id>`

This fixed the prior apparent photo-loss bug.

Manual lot-photo foundation also exists in Supabase:
- dedicated `vehicle-lot-photos` storage bucket
- VIN-linked photo override table
- operator/admin/founder-only mutation
- shoppers read active photos
- staff photos override presentation only
- provider photos remain fallback
- manual photos never override inventory truth such as VIN, price, mileage, or availability

The staff-facing upload/reorder/cover/remove UI is still V1.1 work.

## SwipeMatch / discovery
The previous hero problem was provider-order `.slice(0, 12)`, causing repetitive makes/models such as long Jeep runs.

Current R1 uses diversity-first sampling and session-adaptive behavior:
- initial deck prefers one vehicle per model before repeats
- spreads make/body/condition/transit state when possible
- Keep weights similar body/related vehicles but avoids exact model repetition
- Pass pushes same model/make away and favors diversity
- Mix favors variety
- session only; no persistent preference model yet

Persistent Match DNA is V1.1 work.

## Claims / authority boundary
The user explicitly raised concern that wording could sound like they control the desk's final offer. This was treated as business-risk / claims debt and is a standing boundary.

NorAutoMatch may help shoppers organize preferences, browse verified inventory, compare vehicles, and request dealer follow-up.

A shopper's number is a preference/comfort target, NOT a dealer quote, approval, promise, or binding offer.

Dealership/lender retains final authority over:
- final price
- final payment
- trade value
- financing approval/terms
- incentives
- availability
- taxes/fees
- optional products
- final deal terms

Do not reintroduce copy implying Norris/NorAutoMatch can bind the desk or lender.

## Brand
New approved direction:
- red / black / white NorAuto Match identity
- clean readable NorAuto wordmark
- aggressive red MATCH treatment
- controlled paint splatter/motion accents
- steering-wheel/NAM emblem
- subtle skyline detail inside wheel

Current website placement story:
- header: compact NAM/steering-wheel badge
- footer / brand close: full horizontal NorAuto Match logo
- hero remains focused on `TELL ME THE NUMBER` + SwipeMatch rather than being crowded by the full logo
- square badge is for favicon/avatar/social/small placements
- horizontal primary logo is for business cards, print, social graphics, signage, footer/brand close

A separate user-owned brand kit was created in-chat with primary transparent logo and square badge. Do not claim GitHub binary asset preservation unless directly verified in repository; website branding is currently implemented through the code/brand-image path used on the active branch.

## Supabase
Separate NorAutoMatch project only:
- org: `IgniAqua/ NorAutoMatch`
- project: `igniaqua-norautomatch`
- project ref: `xiqfmaibhhtffrxibiov`
- region: `us-east-2`
- cost: $0/month at setup

TOAT Supabase is off-limits for NorAutoMatch.

Implemented security foundation:
- Auth
- SSR/server/browser clients
- server-side identity verification
- RLS on exposed tables
- profiles
- app memberships
- saved vehicles
- inventory foundation
- private `igniaqua` evidence/control schema
- ordinary new users default to member only
- no elevated browser key
- staff roles protected
- account/garage require verified identity
- manager requires elevated membership plus existing signed/revocable manager-session controls for sensitive APIs

## Packaging / build
The old handoff state saying package-lock was not banked is obsolete.

A real `package-lock.json` is now present canonically on the branch.

The release line has passed dependency resolution, `npm ci`, typecheck, and production build on Render with 0 reported npm vulnerabilities in the verified build resolution.

GitHub hosted Actions capacity had been exhausted historically, so free Render validation/smoke services are the accepted proving path.

## Release receipts / canonical docs
Refresh/consult these before material work:
- `NORAUTOMATCH_SHOWCASE_R1_RELEASE_RECEIPT_2026-09-15.md`
- `SUPABASE_AUTH_R1_RECEIPT.md`
- PR #30 current body

The release and auth receipts were refreshed on 2026-09-16 so they no longer carry stale 133-car / missing-lockfile / hidden-auth state.

## V1.1 backlog — NOT R1 launch blockers
- complete human email-confirmation -> Garage persistence proof if not yet explicitly confirmed
- durable Supabase inventory cache
- recover/enrich the 7 quarantined source rows where alternate Orr/VDP evidence supports it
- persistent Match DNA across sessions
- staff lot-photo upload/reorder/cover/remove UI
- reconcile older Render `main` lineage before canonical production cutover

Do not reopen R1 with random feature creep unless a live defect or consequential risk is found.

## IgniAqua strategic role of NorAutoMatch
The user asked whether NorAutoMatch genuinely helps IgniAqua grow or whether that is only a story. The operating conclusion is YES, if lessons are promoted upward rather than trapped as NorAutoMatch-specific hacks.

Working estimate discussed with user:
- ~40–55% of reusable IgniAqua architecture can be exercised by NorAutoMatch today
- ~55–70% potential as Darwin, Cost, Green Room, research agents, assurance, and provider-neutral patterns mature
- a practical working point estimate used in conversation: ~45% today, ~60% near-term, ~65–70% long-term ceiling

This is NOT a claim that NorAutoMatch is 70% of the company. It means NorAutoMatch can stress-test a large reusable slice of IgniAqua machinery.

High-value IgniAqua mechanisms NorAutoMatch exercises:
- agent orchestration / Green Room
- provider adapters
- evidence/provenance
- truth states
- Darwin improvement lifecycle
- cost routing
- security / authority boundaries
- research agents
- deployment / assurance / receipts
- institutional memory
- specialized agent roles

NorAutoMatch should be treated as a serious public proving ground. When a problem is solved, prefer an IgniAqua reusable mechanism over a vertical-only patch when that generalization is justified.

Examples:
- provider instability -> reusable provider-health/fallback/evidence pattern
- VIN research -> agent passports + challenger + assurance rather than ungoverned scripts
- source disagreement -> reusable truth/provenance handling
- UI/auth failure -> preserved lesson + regression gate

NorAutoMatch does NOT naturally prove everything. TOAT and future verticals remain necessary to exercise accounting, financial reconciliation, document reconstruction, and other domain-specific controls.

## Immediate next mission
1. Reconcile live PR #30 head and public Render state first.
2. If the user explicitly confirms the full auth persistence sequence, record a USER-LIVE PASS receipt and close that gate.
3. Do not merge/promote merely because the showcase is live. Follow repository/governance rules for production/canonical promotion.
4. If R1 is closed, freeze it and move to V1.1 / IgniAqua mechanism extraction rather than random feature additions.
5. Preserve the user's positive mobile feedback as conversational/product feedback, not as automated proof of every route.

## Recent conversation tail — conversational context, NOT canonical truth
User: "Everything is good so far and i think the website looks amazing even on mobile. Do you wanna see it? Also What percentage of IgniAqua would NorAutoMatch help with doing research and using our agents and architecture. I just wanna make sure that my idea of NorAutoMatch helping the company growing and developing is actually a real life thing."

Assistant summarized that NorAutoMatch is a legitimate proving ground for roughly 40–55% of reusable IgniAqua architecture today, potentially 55–70% as reusable mechanisms mature, and emphasized promoting lessons upward rather than leaving them as one-off car-site hacks.

User: "I need that handoff"

Purpose of this file: allow the next worker to resume without asking the user to reconstruct current NorAutoMatch R1 state or the strategic IgniAqua connection.
