# NorAutoMatch R1 Final Closure Candidate Receipt — 2026-10-03

## Frozen release identity
- PR: #30
- branch: `feature/2026-09-15-supabase-auth-r1`
- exact head: `a28f3d341d31747a44ba03f145845b2b0bdf90bc`
- exact tree: `f3b9700146a8fc5df3b9ed2297ed590be234e752`

The frozen tree is byte-identical to the tree exercised by the fresh outside-in smoke.

## Exact-head build validation
Validator service: `norautomatch-auth-r1-validator`
Deploy: `dep-db0pl4ugekts73ap1gtg`
Status: LIVE

Observed:
- package lock up to date
- `npm ci` PASS
- typecheck PASS
- production build PASS
- Next.js 16.3.8
- 28 routes emitted

## Live runtime
Service: `norautomatch-live`
Deploy: `dep-db0plutg1s2s73f5eq9g`
Exact deployed commit: `a28f3d341d31747a44ba03f145845b2b0bdf90bc`
Status: LIVE

Runtime reached Ready and Render exposed the primary URL.

Known runtime debt is preserved rather than hidden:
- Render starts `npx next start -H 0.0.0.0 -p $PORT`
- Next warns that `next start` is not the intended launcher for `output: standalone`
- the current connector cannot edit this existing Render start command in place
- runtime remains healthy under the present command
- inventory cache reports `INVENTORY_CACHE_DATABASE_UNAVAILABLE` and intentionally bypasses to the verified-live provider path

## Fresh outside-in proof
Independent smoke service deploy: `dep-db0phkmgekts73aojjcg`
Tested tree: `f3b9700146a8fc5df3b9ed2297ed590be234e752`

PASS:
- `/` 200
- `/inventory` 200
- `/api/inventory` 200
- `/vehicles` 200
- `/login` 200
- signed-out `/account`, `/garage`, `/manager` redirect to login
- VIN detail 200 with VIN, source-verification label, equipment, and Ridemotive image

Inventory observation:
- source: `orr-live`
- raw / normalized / eligible: 387 / 387 / 387
- rejected: 0
- errors: 0
- in transit: 32
- image-backed: 381

## Human auth gates
BANKED PASS:
- account creation
- confirmation email received
- confirmation clicked
- confirmed protected account entered
- Garage persistence across sign-out/re-authentication

Dedicated Supabase verification established one confirmed auth user, one profile, and one active `norautomatch/member` membership.

## Durable database preservation
The expiring Render Postgres was exported with PostgreSQL 17.11 `pg_dump` and inspected.

Only one explicitly synthetic production-validation CRM evidence set was present. Its five non-empty business-table rows were migrated idempotently into dedicated NorAutoMatch Supabase:
- opportunity: 1
- evidence: 1
- follow-up: 1
- manager handoff: 1
- outbox event: 1

Legacy migration-tracker rows were intentionally not imported.

## Dependency security truth
Production dependency audit:
- `npm audit --omit=dev --audit-level=high`
- result: 0 vulnerabilities

Full development-toolchain audit:
- 8 high
- 0 critical
- current blocker chain includes `braces@3.0.3` through Tailwind/ESLint tooling
- the applicable braces advisory currently has no patched version
- non-force audit remediation does not close the chain
- force remediation proposes a breaking Tailwind major upgrade and was not applied during R1 closure

Current GitHub Actions failures are observed at the repository's full `Dependency security gate` before later workflow steps. This release receipt does not relabel those failed workflows as passes.

## V1.1 boundary
PRs #32-#36 remain separately governed post-R1 work and are not required for R1 closure:
- #32 durable inventory cache: runtime activation/readback still open
- #33 lot-photo operator: optional post-R1
- #34 quarantine recovery: optional post-R1
- #35 public lot-photo presentation: optional post-R1
- #36 Garage compare/saved-change intelligence: optional post-R1

## Promotion disposition
PR #30 is ready for review and mergeable into canonical staging branch `reactivation/2026-09-08`.

Merging #30 is a staging promotion, not promotion to stale `main`.

Final main promotion must separately account for the existing Render service `NorAutoMatch` that tracks `main` with auto-deploy enabled.

## Current disposition
**CONDITIONALLY_PRODUCTION_READY**

Rationale:
- functional live runtime: PASS
- fresh outside-in runtime: PASS
- human auth/mailbox closure: PASS
- production dependencies: CLEAN
- dedicated Supabase cutover: PASS
- expiring legacy DB evidence preservation: PASS
- V1.1 correctly separated: PASS
- dev-toolchain unpatched advisory: OPEN, explicitly bounded
- Render standalone launcher normalization: OPEN
- main canonical promotion: OPEN

Authority effect: NONE.
