# NorAutoMatch Supabase Auth R1 — Candidate Receipt

Date: 2026-09-15
Status: IMPLEMENTED CANDIDATE / DATABASE VERIFIED / EXTERNAL BUILD VERIFIED / USER-LIVE OPEN
Authority effect: NONE
Production effect: NONE

## Live Supabase foundation

- Project: `igniaqua-norautomatch`
- Project ref: `xiqfmaibhhtffrxibiov`
- Region: `us-east-2`
- Cost at creation: `$0/month`
- TOAT project intentionally not used.

## Database controls verified

- RLS enabled on every exposed `public` table.
- `profiles`: authenticated users may select/insert/update only their own row.
- `saved_vehicles`: authenticated users may select/insert/delete only their own rows.
- `app_memberships`: authenticated users have SELECT only and can see only their own memberships; users cannot self-promote.
- `inventory_vehicles`: browser roles have SELECT only and can see only `ACTIVE_CURRENT` or `ACTIVE_STALE` rows.
- `igniaqua.evidence_events`: private schema; no browser grants or policies by design.
- New Auth users receive a profile plus `norautomatch/member`; no operator/admin/founder role is auto-issued.
- A post-DDL privilege audit found broader default authenticated grants on user tables; these were removed and least-privilege grants were independently re-queried afterward.

## Application controls implemented on this branch

- Supabase SSR browser/server clients.
- Next.js 16 root `proxy.ts` session refresh using `getClaims()`.
- `/login` password sign-in and signup actions.
- email confirmation route.
- sign-out route.
- `/account` protected by verified Supabase identity.
- `/garage` protected by verified Supabase identity and owner-scoped RLS.
- `/manager` additionally requires active NorAutoMatch `operator`, `admin`, or `founder` membership.
- Existing manager API HMAC/session + durable-revocation boundary remains in place; Supabase membership does not replace it.

## External Cost/Darwin verification receipt

GitHub-hosted Actions capacity was exhausted, so verification was routed to a temporary free Render service rather than purchasing additional CI capacity.

Validated candidate SHA: `cdf606df984f6adea3c37ca117f266abfe1c7e96`
Validator service: `norautomatch-auth-r1-validator`
Render deploy: `dep-dakqdcnf3r2c73du8hi0`

Observed build evidence:
- `npm install --package-lock-only --ignore-scripts` completed.
- dependency audit covered 521 packages and reported 0 vulnerabilities.
- `npm ci` completed.
- `npm run typecheck` completed with no TypeScript error.
- `npm run build` completed successfully under Next.js 16.3.3.
- all 28 application routes generated successfully, including `/login`, `/account`, `/garage`, `/manager`, `/auth/confirm`, and `/auth/signout`.
- Render reported `Build successful` and the temporary validator became live.

This verifies the application build behavior for the exact candidate SHA above. It does not equal deployment to the customer-facing NorAutoMatch service or user-live authentication proof.

## Remaining gates

1. The generated `package-lock.json` exists in the external validator build but has not yet been banked back into GitHub because the current execution environment cannot directly retrieve the validator-hosted artifact. This is a packaging/provenance gap, not a failed build.
2. Render's existing customer-facing NorAutoMatch service tracks `main` with auto-deploy enabled, while the verified inventory canonical branch is `reactivation/2026-09-08`; do not inject auth env vars or deploy until that branch boundary is deliberately reconciled.
3. User-live signup, email confirmation, login, logout, customer-route protection, and manager-role denial/allow behavior remain to be proven after a safe preview/deployment path is prepared.

No completion claim beyond the states above is authorized by this receipt.
