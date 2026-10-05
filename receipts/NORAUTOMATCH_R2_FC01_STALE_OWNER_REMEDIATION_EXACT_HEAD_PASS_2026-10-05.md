# NorAutoMatch R2 FC-01 Stale Owner Remediation — Exact-Head PASS

Date: 2026-10-05

Repository: `norrijam405/NorAutoMatch`

Draft remediation PR: #58

Failed predecessor candidate:
- commit: `da014f6ddbf863ae8b5bd05ec3489913191cb122`
- tree: `fd0b4f4de0d325dc9aae9f154f8021c685d66a2b`

Fresh Challenger finding:
`NORAUTOMATCH-R2-FC-01 — STALE_CONVERSATION_OWNER_CAN_PUBLISH_SAME_SITE_REPLY_AFTER_OWNERSHIP_TRANSFER`

Frozen remediation candidate:
- commit: `936b9bbd81ac83afc9383cf3b74b806c2ecdcbf3`
- tree: `4afd8c37afaa90cf67068b4258e011a21c0d914f`

Remediation:
- current-owner authorization moved into the site-reply mutation primitive
- ownership check and reply insert execute in one PostgreSQL transaction
- exact conversation assignment row is locked with `FOR UPDATE`
- stale/non-owner actor fails closed before insert
- route-level precheck removed as the authority boundary
- deterministic two-transaction race regression added

Dedicated verification:
- workflow: `NorAutoMatch R2 FC-01 Stale Owner Remediation CI`
- run: `37369218255`
- conclusion: **SUCCESS**

Verified gates:
- locked dependency installation
- production dependency security gate
- bounded conversation/ownership/site-thread schemas
- deterministic stale-owner ownership-transfer race regression
- TypeScript application typecheck
- production build

Race proof:
1. Rep A owns the conversation.
2. A second PostgreSQL transaction transfers ownership to Rep B and holds the row lock.
3. Rep A begins same-site publication and blocks on the exact assignment row.
4. Rep B ownership transaction commits.
5. Rep A resumes, observes Rep B as current owner, and fails with `SITE_CHAT_REPLY_CURRENT_OWNER_REQUIRED`.
6. No stale-owner reply is inserted.
7. Rep B can publish successfully as current owner.

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
