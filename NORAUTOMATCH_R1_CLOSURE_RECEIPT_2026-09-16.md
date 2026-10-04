# NorAutoMatch R1 Closure Receipt — 2026-09-16

## Truth state

**CUSTOMER-SHOWABLE / PUBLIC-LIVE / OUTSIDE-IN VERIFIED**

This receipt does not claim canonical merge, durable-cache completion, or human email-confirmation completion. It records the public R1 product state proven on the live showcase.

## Public surface

- URL: `https://norautomatch-live.onrender.com`
- Render workspace: `Nor Auto Match`
- Live branch: `feature/2026-09-15-supabase-auth-r1`
- Verified release SHA: `e78802ec06b194c05e1e6e4c835cd1edf3c57145`
- Public smoke service: `norautomatch-public-smoke-r2`

## Exact-SHA build proof

Free Render validator executed against the release line with:

- dependency resolution
- `npm ci`
- `npm run typecheck`
- Next.js production build
- 28 routes generated
- 521 packages audited
- 0 reported npm vulnerabilities

## Outside-in public smoke — PASS

Against `https://norautomatch-live.onrender.com`:

- `/` -> 200
- `/inventory` -> 200
- `/api/inventory` -> 200
- `/vehicles` -> 200
- `/login` -> 200
- `/account` -> 307 to login while signed out
- `/garage` -> 307 to login while signed out
- `/manager` -> 307 to login while signed out

### Homepage / SwipeMatch gates

- Live SwipeMatch present
- Full details action present
- Garage action present
- Verified VIN label present
- Ridemotive vehicle image present
- session-adaptive discovery state present
- Sign in visible in navigation
- Garage visible in navigation
- approved NAM branded badge present
- NorAuto Match brand name present

### Auth UX gates

- Sign-in mode present
- Create-account mode present
- Create-account mode is separately addressable
- only one primary submit action is shown in sign-in mode
- resend-confirmation recovery is present
- auth confirmation route supports PKCE code and token-hash confirmation paths

### Live inventory evidence at closure smoke

- source: `orr-live`
- effective mode: `live-enabled`
- raw active store-associated source units: **405**
- normalized/customer-usable units: **398**
- quarantined malformed source rows: **7**
- in-transit units retained: **15**
- warnings preserved: **15**
- image-backed usable vehicles: **395 / 398**
- photo coverage: **99.246%**

Inventory count is live source truth and may drift as the dealer feed changes. NorAutoMatch does not treat in-transit status as unsellable.

### VIN-detail proof

Smoke VIN: `1C4BJWEG6GL118769`

- detail route -> 200
- VIN present
- source-verified marker present
- source-provided equipment section present
- Ridemotive image present

## Brand state

Approved NorAuto Match visual system is now represented in the runtime:

- NAM steering-wheel/skyline badge in the site header
- primary horizontal NorAuto Match wordmark in the footer
- homepage hero intentionally left visually independent
- high-resolution transparent originals preserved in the external brand kit for print/business-card/social use

## Claims / authority boundary

Customer-facing copy was tightened so that:

- a shopper's number is a preference/comfort target, not a dealer quote, approval, or promise
- NorAutoMatch does not set or approve the dealership's final deal
- the applicable dealership and lender determine and confirm final price, payment, trade value, financing, incentives, availability, and transaction terms
- customer signup never grants operator, manager, pricing, financing, or dealership authority

Authority effect: **NONE**.

## Durable inventory-cache closure finding

The live warning `INVENTORY_CACHE_DATABASE_UNAVAILABLE` was traced to the current cache loader requiring `NORAUTO_CRM_DATABASE_URL`. The NorAuto Supabase project was checked directly and does **not** currently contain the cache tables expected by this reader: `inventory_provider_snapshots` and `inventory_provider_current_state`. No proven migration defining those exact tables was found in the repository. Therefore R1 intentionally keeps the already-proven bounded process-local TTL + single-flight Orr fallback rather than wiring a database URL into an absent schema. Durable caching remains V1.1 work and must be introduced through an explicit reviewed migration before activation.

## R1 follow-on hardening — not blockers to customer-showable status

1. Bank the externally generated deterministic `package-lock.json` into canonical Git history. The correct lock is generated and `npm ci`-proven externally; the committed lock remains the older pre-Supabase tree.
2. Design, review, migrate, and then activate durable Supabase inventory caching. The expected cache tables are not yet present; do not configure `NORAUTO_CRM_DATABASE_URL` until the schema is proven.
3. Complete a real human signup -> email confirmation -> login -> Garage persistence exercise.
4. Enrich/recover the seven quarantined source rows where Orr/VDP evidence supports it.
5. Build the operator UI for VIN-bound lot-photo upload/reorder/cover selection.
6. Persist long-term Match DNA/preferences beyond the current session-adaptive algorithm.
7. Reconcile the older Render `main` deployment lineage before using it as production authority.
8. Normalize Render's start command to the Next standalone server path; current service is live but emits a non-fatal `next start`/standalone warning.

## Promotion boundary

R1 is **public-live and customer-showable** on the showcase service. PR #30 remains a draft candidate until canonical packaging/merge and remaining promotion gates are explicitly closed. Deployment does not imply deal authority, canonical merge, or customer financial approval.
