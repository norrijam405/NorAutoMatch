# NorAutoMatch Showcase R1 — Closure Receipt

Date: 2026-09-16
Truth state: **PUBLIC SHOWCASE LIVE / OUTSIDE-IN VERIFIED / DEMO-READY**
Authority effect: **NONE**
Customer transaction authority: **NONE**
Paid infrastructure commitment: **NONE**

## Public showcase

- URL: `https://norautomatch-live.onrender.com`
- Render service: `srv-dakr4qlbedkc73c75pi0`
- Workspace: `Nor Auto Match`
- Plan: free
- Region: Ohio
- Source branch: `feature/2026-09-15-supabase-auth-r1`
- Current verified branch / live release head: `e78802ec06b194c05e1e6e4c835cd1edf3c57145`

The older Render service tracking `main` remains intentionally untouched because its branch lineage differs from the verified NorAutoMatch candidate/canonical lineage.

## Build and packaging proof

The current release line has been routed through the external free Render validator because GitHub-hosted Actions capacity was exhausted.

Verified on the release line:
- dependency resolution completed
- `npm ci` completed
- TypeScript typecheck completed
- Next.js production build completed
- route generation completed
- 521 packages audited in the validator flow with 0 npm vulnerabilities reported at that time
- generated `package-lock.json` is now banked canonically in the candidate branch

## Hardened outside-in public smoke

The hardened smoke worker passed against the live public URL after the auth/navigation/branding corrections.

Verified:
- `/` -> 200
- `/inventory` -> 200
- `/api/inventory` -> 200
- `/vehicles` -> 200
- `/login` -> 200
- unauthenticated `/account` -> 307 to login
- unauthenticated `/garage` -> 307 to login
- unauthenticated `/manager` -> 307 to login
- homepage contains Live SwipeMatch
- homepage contains Full details
- Garage entry is present in the customer journey
- Verified VIN marker is present
- real Ridemotive vehicle image is present
- session-adaptive SwipeMatch marker is present
- primary navigation exposes Sign in
- primary navigation exposes Garage
- new NAM brand badge is present
- NorAuto Match brand name is present
- auth screen has distinct Sign in and Create account modes
- auth screen exposes one primary submit action per mode
- resend-confirmation recovery is present

## Current live inventory evidence

Latest hardened smoke observed:
- source: `orr-live`
- mode: `live-enabled`
- active store-associated source units: 405
- fully normalized / customer-usable units: 398
- quarantined structured rows: 7
- in-transit units retained: 15
- usable vehicles with HTTP/Ridemotive photos: 395 / 398 (~99.25%)

Inventory counts are expected to drift with live dealer inventory. The public store boundary follows the Orr site semantics: active inventory associated through `dealer_ids` containing dealer 2175. In-transit vehicles remain eligible because they can still be sold/reserved rather than being automatically hidden.

Seven imperfect rows are quarantined for incomplete structured fields; they are not represented as nonexistent or unsellable. They remain a V1.1 enrichment target.

## VIN detail proof

Latest VIN smoke used `1C4BJWEG6GL118769` and returned 200.

Observed:
- exact VIN present
- source-verification label present
- source-provided equipment section present
- Ridemotive image present

Vehicle detail pages expose source-supported values only. Missing values remain missing rather than being inferred.

## Customer experience banked in R1

- photo-backed hero SwipeMatch
- diversity-first initial discovery deck instead of provider-order slicing
- session-adaptive Pass / Keep / Mix behavior
- Full details routes to the exact VIN page
- Garage is discoverable from the primary experience
- provider image IDs are expanded into usable Ridemotive CDN URLs
- live photos, pricing, mileage, drivetrain, colors, engine, transmission, MPG, incentives, stock and equipment are shown only when source-supported
- dead-looking homepage controls reduced or converted into real actions / clearly informational presentation
- shopper budget/payment inputs are framed as preferences/targets, not dealer quotes, approvals, guarantees or final desk figures
- dealership/lender retain final authority over price, payment, trade, financing, incentives, availability and final deal terms

## Auth / account hardening

- separate Supabase project: `igniaqua-norautomatch` (`xiqfmaibhhtffrxibiov`)
- TOAT is not used
- Supabase Auth foundation
- server-side identity verification
- RLS owner-scoped profiles and saved vehicles
- ordinary new users bootstrap only to `norautomatch/member`
- `/account` and `/garage` require verified identity
- `/manager` requires elevated NorAutoMatch membership and preserves the existing short-lived signed/revocable manager-session boundary for sensitive APIs
- Sign in is visible from the header
- Garage is visible from primary navigation
- Sign in and Create account are separate modes
- resend confirmation recovery is exposed
- confirmation callback handles both PKCE auth-code and token-hash confirmation flows

A complete successful human signup -> email confirmation -> sign in -> saved Garage persistence exercise is still an open user-live proof. Automated route/auth UI verification does not substitute for that human mailbox step.

## Branding

R1 now uses the new NorAuto Match red/black/white automotive identity with the NAM steering-wheel badge and skyline detail. Public smoke gates brand discoverability so the badge/brand cannot silently disappear in a later release.

The full transparent primary logo and square badge are also preserved separately in the user's NorAutoMatch brand kit for print, business-card, social and merchandise use.

## V1.1 / follow-on hardening

These remain open without invalidating the current live R1 showcase:
- durable Supabase inventory cache instead of the bounded verified-live in-process/single-flight fallback
- one successful human signup -> email confirmation -> sign in -> Garage persistence proof
- recover/enrich the 7 quarantined source rows where alternate Orr/VDP evidence supports it
- persist Match DNA / shopper preferences across sessions
- complete the staff lot-photo UI: upload, reorder, choose cover, remove/replace
- reconcile the older Render `main` service lineage before any canonical production cutover

## Closure interpretation

NorAutoMatch R1 is **customer-showable, live, functional, and demo-ready**.

This receipt does not claim that V1.1 hardening is complete, does not grant deal/financial authority, and does not promote the unrelated older `main` deployment.
