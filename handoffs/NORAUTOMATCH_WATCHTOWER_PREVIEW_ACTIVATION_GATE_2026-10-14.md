# Torque Watchtower — verified preview activation gate
Date: 2026-10-14
Repository: norrijam405/NorAutoMatch
Candidate branch: remediation/2026-10-13-scout-hunt-relevance-gate
Last code fix: 1726cae3ebc2cabbf5d46528f1a4a070afc9c92c
PR: https://github.com/norrijam405/NorAutoMatch/pull/78

## Observed, not assumed
- Watchtower route exists: src/app/manager/watchtower/page.tsx.
- Route requires operator/admin/founder membership and is excluded from indexing.
- Fresh Up server actions and Vehicle Hunt/Scout PostgreSQL read models exist.
- Current application intentionally requires NORAUTO_CRM_DATABASE_URL and the v13 tables for persistence.
- The connected Vercel account returned four projects (norvana, igni-aqua-frontend, sentinel, igniaqua-front); none was NorAutoMatch. A NorAutoMatch Vercel deployment is NOT verified.
- Local Git clone attempt could not resolve github.com; it did not execute tests.
- Prior software CI PASS: run 38492255511 at 92665f1bfe5f85b16234a769f4d16a923285ab20. This does not validate later commits.
- Actions on this branch are workflow_dispatch only; do not trigger repeated runs for individual commits.

## Current preview acceptance gate
1. Review the exact feature/remediation diff, including reconciliation of the separate handoff commit on the feature branch.
2. Run one bundled exact-candidate check (Node behavior, PostgreSQL v13 + RLS + persistence, typecheck, build, plus security audit disclosure). Capture run ID and commit; never transfer a PASS across commits.
3. Resolve a deployment destination explicitly bound to NorAutoMatch. Do not reuse an unrelated Vercel project, introduce paid resources, or silently mutate production.
4. Preview-only: configure authorized role membership; use an isolated database or explicit synthetic-data test scope. No production CRM credentials or customer PII.
5. Confirm /manager/watchtower login and role enforcement; verify diagnostic states NOT_CONFIGURED, READ_FAILED, and READY only from observed runtime conditions.
6. Create one synthetic Fresh Up Vehicle Hunt, verify readback and truth flags, perform a safe inventory search, and inspect Scout queue expiry / pause / consent-revocation behavior.
7. No dealership CRM write, customer communication send, live provider activation, or claim of dealer-wide availability without independent authority.
8. Preserve preview URL, exact deployed SHA, evidence and rollback instructions. Until then, claim SOURCE_IMPLEMENTED / PREVIEW_NOT_VERIFIED.

## Known issue addressed in candidate
Database pool construction in the Watchtower page was outside the error boundary. The page now catches constructor failure, clears any partial read results, and reports READ_FAILED; it closes an initialized pool in finally.

## Disposition
Preview not established. Latest branch requires combined exact-head CI; independent challenge pending. No production authority.
