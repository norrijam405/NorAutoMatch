# NorAutoMatch Supabase Auth R1 — Candidate Receipt

Date: 2026-09-15
Status: IMPLEMENTED CANDIDATE / DATABASE VERIFIED / APPLICATION BUILD VERIFICATION OPEN
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

## Open proving gates

1. `package.json` pins `@supabase/ssr` and `@supabase/supabase-js`, but `package-lock.json` has not yet been regenerated because the available local runtime has no npm network access and GitHub Actions hosted capacity is exhausted.
2. Do not merge/deploy until the lockfile is regenerated on a qualified external/local runner and `npm ci`, `npm run typecheck`, and `npm run build` pass against the exact candidate SHA.
3. Render currently tracks `main` with auto-deploy enabled, while the verified inventory canonical branch is `reactivation/2026-09-08`; do not inject auth env vars or deploy until that branch boundary is deliberately reconciled.
4. User-live signup/email-confirmation/login/logout and role-gate behavior remain to be proven after deployment.

No completion claim beyond the states above is authorized by this receipt.
