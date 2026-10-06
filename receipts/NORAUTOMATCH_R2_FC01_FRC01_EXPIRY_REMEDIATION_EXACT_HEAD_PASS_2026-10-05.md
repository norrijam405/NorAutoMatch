# NorAutoMatch R2 FRC-01 Expiry-After-Lock Remediation — Exact-Head PASS

Date: 2026-10-05

Repository: `norrijam405/NorAutoMatch`

Draft remediation PR: #59

Failed predecessor:
- commit: `936b9bbd81ac83afc9383cf3b74b806c2ecdcbf3`
- tree: `4afd8c37afaa90cf67068b4258e011a21c0d914f`

Fresh Re-Challenger finding:
`NORAUTOMATCH-R2-FC01-FRC-01 — EXPIRED_SITE_THREAD_ACCESS_CAN_PUBLISH_AFTER_OWNERSHIP_LOCK_WAIT`

Frozen remediation candidate:
- commit: `a3311dac4891efdada833e5fc06d7c42ff7898fd`
- tree: `95afba81c0e51d0d66feb7f81e78506b0ac1cc8e`

Remediation:
- preserves atomic current-owner authorization and `FOR UPDATE` ownership lock
- changes site-thread expiry eligibility from transaction-stable `current_timestamp` to wall-clock `clock_timestamp()`
- evaluates expiry only after the ownership lock has been obtained
- adds deterministic regression where access expires while publication waits on the ownership lock
- retains the original stale-owner transfer race regression

Dedicated verification:
- workflow: `NorAutoMatch R2 FRC-01 Expiry-After-Lock Remediation CI`
- run: `37397221338`
- conclusion: **SUCCESS**

Verified gates:
- locked dependency installation
- production dependency security gate
- bounded conversation/ownership/site-thread schemas
- TypeScript verification compile
- original stale-owner ownership-transfer race
- mutation-time expiry-after-lock race
- application typecheck
- production build

Expiry race proof:
1. Current owner is valid and access is initially active.
2. A second transaction holds the exact conversation-assignment row lock.
3. Publication begins and blocks on the ownership lock.
4. Site-thread access expires in wall-clock time while publication is waiting.
5. Challenger confirms expiration with `clock_timestamp()`.
6. Ownership lock is released.
7. Publication resumes, re-evaluates against wall-clock time, and fails with `SITE_CHAT_REPLY_THREAD_NOT_ACTIVE`.
8. No reply is inserted.

Boundaries:
- no unrelated remediation
- no merge
- no production deployment
- no live customer traffic
- no secure-document activation
- no inventory-cache activation
- no Motive/RideMotive execution
- no outbound customer communication

Disposition:
**REMEDIATION_BUILDER_EXACT_HEAD_PASS / NEW_SUCCESSOR_FROZEN / FRESH_RECHALLENGE_REQUIRED / NO_PRODUCTION_ACTIVATION**
