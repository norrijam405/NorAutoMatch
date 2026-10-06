# NorAutoMatch R2 FRC-02 Commit-Time Expiry Remediation — Exact-Head PASS

Date: 2026-10-05

Repository: `norrijam405/NorAutoMatch`

Draft remediation PR: #60

Failed predecessor:
- commit: `a3311dac4891efdada833e5fc06d7c42ff7898fd`
- tree: `95afba81c0e51d0d66feb7f81e78506b0ac1cc8e`

Fresh Re-Challenger finding:
`NORAUTOMATCH-R2-FC01-FRC-02 — SITE_THREAD_ACCESS_CAN_EXPIRE_AFTER_ELIGIBILITY_CHECK_BEFORE_REPLY_COMMIT`

Frozen remediation candidate:
- commit: `3e2a612decade0c953f4c2202ce507430026bd25`
- tree: `345ec780c28b5ae04381b3960f1d7dc040830d12`

Remediation:
- preserves atomic current-owner authorization and ownership-row `FOR UPDATE` lock
- preserves post-ownership-lock wall-clock access check using `clock_timestamp()`
- adds a second site-thread access revalidation after the reply INSERT and immediately before COMMIT
- if access expires while the INSERT is blocked, publication throws `SITE_CHAT_REPLY_THREAD_NOT_ACTIVE` and the transaction rolls back the inserted row
- carries forward the Fresh Re-Challenger's exact FRC-02 `ACCESS EXCLUSIVE` reproducer
- retains previous FC-01 and FRC-01 race regression coverage

Security prerequisite encountered during verification:
- npm published a high-severity advisory for production transitive dependency `source-map-js@1.2.1`
- patched production transitive dependency to `source-map-js@1.2.2`
- no framework-major migration or application behavior change
- production dependency security gate passed on the frozen successor

Dedicated verification:
- workflow: `NorAutoMatch R2 FRC-02 Commit-Time Expiry Remediation CI`
- successful run: `37399334033`
- conclusion: **SUCCESS**

Verified gates:
- locked dependency installation
- production dependency security gate
- bounded conversation/ownership/site-thread schemas
- TypeScript verification compile
- original stale-owner ownership-transfer race
- FRC-01 expiry-during-ownership-lock race
- exact FRC-02 expiry-after-eligibility / blocked-INSERT counterexample
- application typecheck
- production build

FRC-02 proof:
1. Current owner and active site-thread access are seeded.
2. A separate transaction holds `ACCESS EXCLUSIVE` on `crm_site_chat_replies`.
3. Publication passes event, ownership, and first access eligibility checks.
4. Publication blocks at the reply INSERT.
5. Site-thread access expires while the INSERT is blocked.
6. Blocker releases.
7. INSERT executes inside the transaction.
8. The post-insert, pre-commit access revalidation observes expiry and throws `SITE_CHAT_REPLY_THREAD_NOT_ACTIVE`.
9. Transaction rollback removes the inserted reply.
10. Final published reply count remains zero.

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
