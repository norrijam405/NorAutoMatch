# NorAutoMatch Showcase R1 — Public Release Receipt

Date: 2026-09-15
Truth state: PUBLIC SHOWCASE LIVE / OUTSIDE-IN VERIFIED
Authority effect: NONE
Customer transaction authority: NONE
Paid infrastructure commitment: NONE

## Public showcase

- URL: `https://norautomatch-live.onrender.com`
- Render service: `srv-dakr4qlbedkc73c75pi0`
- Workspace: `Nor Auto Match`
- Plan: free
- Region: Ohio
- Source branch: `feature/2026-09-15-supabase-auth-r1`
- Release candidate SHA proven before smoke: `3728d58118ad3a101dd02114acb16ee9535b0715`

The older Render service tracking `main` was intentionally left untouched because its branch lineage does not match the verified NorAutoMatch canonical/candidate lineage.

## Build proof

The exact release candidate SHA was routed through the external Render validator because GitHub-hosted Actions capacity was exhausted.

Observed PASS evidence:
- dependency resolution completed
- `npm ci` completed
- `npm run typecheck` completed
- Next.js 16.3.3 production build completed
- all 28 routes generated
- 521 packages audited
- 0 npm vulnerabilities reported by that resolution/build

## Live inventory proof

The public inventory path is `live-enabled` and uses the authorized Orr Nissan West public inventory boundary.

Outside-in smoke observed:
- `/` -> 200
- `/inventory` -> 200
- `/api/inventory` -> 200
- `/vehicles` -> 200
- `/login` -> 200
- `/account` -> 307 to `/login?next=%2Faccount`
- `/garage` -> 307 to `/login?next=%2Fgarage`
- `/manager` -> 307 to `/login?next=%2Fmanager`

Inventory API evidence in the smoke:
- source: `orr-live`
- effective mode: `live-enabled`
- customer-visible live inventory: true
- eligible vehicles returned: 133
- first smoke VIN: `1C4HJXDGXJW280847`

Earlier live-source evidence for the same release line recorded:
- raw dealer records: 293
- normalized records: 289
- customer-eligible VINs: 133
- warnings preserved: 15
- normalization errors preserved: 4

No demonstration inventory is silently substituted when the live source fails verification.

## VIN detail proof

Outside-in VIN smoke opened:
`/vehicles/1C4HJXDGXJW280847`

Observed:
- HTTP 200
- requested VIN present in rendered body
- `Source-verified VIN` marker present
- `Source-provided equipment` section present

VIN detail pages expose only source-supported fields such as advertised price, MSRP when present, stock number, mileage, drivetrain, colors, engine, transmission, fuel type/economy, source photos, incentives, and equipment. Missing fields remain missing rather than inferred.

## Reliability correction proven

The first showcase implementation independently refetched the entire dealer snapshot from homepage/catalog/API/detail surfaces and could hit the Orr request timeout under multi-route smoke.

R1 correction:
- cache-first live loader remains the preference
- verified live fallback now uses bounded process-local TTL caching
- concurrent callers share a single in-flight verified live fetch
- VIN detail work shares the coalesced snapshot rather than performing an unrelated full fetch
- TTL is intentionally short so stale data is not converted into durable truth

The post-fix multi-route outside-in smoke passed.

## Supabase / Auth state

Separate project: `igniaqua-norautomatch`
Project ref: `xiqfmaibhhtffrxibiov`
TOAT is not used.

Implemented and previously verified:
- Supabase Auth foundation
- RLS-protected profiles
- owner-scoped saved vehicles / Garage
- role membership table
- new users receive only `norautomatch/member`
- `/account` and `/garage` require verified identity
- `/manager` requires an elevated NorAutoMatch membership before page entry
- existing signed short-lived manager-session + durable revocation boundary remains required for sensitive manager APIs

User-live email-confirmation/login/logout with a real test account remains a separate open proof and is not implied by unauthenticated route protection.

## Remaining hardening / promotion work

1. Durable Supabase inventory cache: designed but the Supabase management connector returned upstream 502 on the migration attempt. The public showcase is protected meanwhile by bounded single-flight in-process caching and verified-live fail-closed behavior.
2. Bank the externally generated `package-lock.json` into GitHub for complete Docker/npm-ci artifact provenance. External `npm ci` proof exists; the generated lock artifact itself is not yet canonical in GitHub.
3. Reconcile the older Render `main` service versus the verified NorAutoMatch branch lineage before any canonical production cutover.
4. Prove real signup/email confirmation/login/logout and operator allow/deny paths user-live.

No statement in this receipt promotes the older `main` deployment, grants financial/deal authority, or converts the showcase into a dealer-branded production system.
