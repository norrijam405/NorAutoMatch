# NorAutoMatch R2 FRC-03 Access Commit Guard Remediation — Exact-Head PASS

Date: 2026-10-05

Repository: `norrijam405/NorAutoMatch`

Draft remediation PR: #61

Failed predecessor:
- commit: `3e2a612decade0c953f4c2202ce507430026bd25`
- tree: `345ec780c28b5ae04381b3960f1d7dc040830d12`

Fresh Re-Challenger finding:
`NORAUTOMATCH-R2-FC01-FRC-03 — SITE_THREAD_ACCESS_REVOCATION_AFTER_FINAL_QUERY_CAN_COMMIT_REPLY`

Frozen remediation candidate:
- commit: `1c37dc6c389ac8531f1d3cbd78a3d28a4f8e4448`
- tree: `d5f52430d4b92429d5e936550437e94c0cdc46b1`

Remediation:
- preserves atomic current-owner authorization and ownership-row `FOR UPDATE` lock
- acquires `FOR UPDATE` on the exact `crm_site_chat_access` row before reply insertion
- evaluates access activity with PostgreSQL `clock_timestamp()`
- holds the access-row lock through reply commit, serializing concurrent revocation behind publication
- adds deferred PostgreSQL constraint trigger `crm_site_chat_reply_access_commit_guard`
- trigger revalidates access existence + expiry with `clock_timestamp()` during transaction commit
- commit fails closed with `SITE_CHAT_REPLY_THREAD_NOT_ACTIVE` if access is missing or expired
- retains FC-01, FRC-01, and FRC-02 regression coverage
- adds deterministic FRC-03 revocation-serialization regression

Dedicated verification:
- workflow: `NorAutoMatch R2 FRC-03 Access Commit Guard Remediation CI`
- run: `37407072582`
- conclusion: **SUCCESS**

Verified gates:
- locked dependency installation
- production dependency security gate
- bounded conversation/ownership/site-thread schemas
- TypeScript verification compile
- historical ownership + expiry races
- exact FRC-02 blocked-INSERT expiry counterexample
- FRC-03 revocation serialization
- application typecheck
- production build

FRC-03 proof:
1. Publication locks the access row before inserting the reply.
2. Concurrent revocation cannot commit while publication holds that row lock.
3. Reply INSERT executes inside the same transaction.
4. Deferred commit trigger rechecks access existence + wall-clock expiry at commit.
5. If access remains valid, publication commits first and revocation may commit afterward.
6. If access is gone/expired before publication owns the required lock/commit condition, publication fails closed.
7. No stale positive application QueryResult can authorize commit after a committed revocation.

Boundaries:
- no merge
- no production deployment
- no live customer traffic
- no secure-document activation
- no inventory-cache activation
- no Motive/RideMotive execution
- no outbound customer communication

Disposition:
**REMEDIATION_BUILDER_EXACT_HEAD_PASS / NEW_SUCCESSOR_FROZEN / FRESH_RECHALLENGE_REQUIRED / NO_PRODUCTION_ACTIVATION**
