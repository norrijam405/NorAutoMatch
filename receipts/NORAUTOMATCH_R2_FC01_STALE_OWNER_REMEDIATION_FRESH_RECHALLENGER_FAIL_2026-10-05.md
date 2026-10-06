# NorAutoMatch R2 FC-01 Remediation Successor — Fresh Re-Challenger FAIL

Date: 2026-10-05

Repository: `norrijam405/NorAutoMatch`

Remediation PR: #58

Fresh Re-Challenger role: separate adversarial challenger. No remediation performed.

## Exact frozen candidate

- commit: `936b9bbd81ac83afc9383cf3b74b806c2ecdcbf3`
- tree: `4afd8c37afaa90cf67068b4258e011a21c0d914f`

The Git commit object resolves to the exact tree above.

## Finding

**NORAUTOMATCH-R2-FC01-FRC-01 — EXPIRED_SITE_THREAD_ACCESS_CAN_PUBLISH_AFTER_OWNERSHIP_LOCK_WAIT**

Disposition: **FAIL / challenger stop boundary**

Mandatory challenge theme hit:
- expired site-thread access must fail closed
- transfer/lock wait ordering around publication

## Expected invariant

A same-site reply must be eligible at the time the reply is actually committed. If the site-thread access expires while publication is blocked waiting for the conversation ownership row lock, publication must fail closed and no reply may be inserted.

## Exact-candidate source cause

`src/lib/site-chat-thread.ts` opens the PostgreSQL transaction before it waits on:

`crm_conversation_assignments ... FOR UPDATE`

After that wait, it checks site-thread access with:

`expires_at > current_timestamp`

In PostgreSQL, `current_timestamp` is the transaction start time. Therefore a transaction that starts while access is still active can wait on the ownership lock until after access expires, then resume and still see the old transaction-start timestamp as "current", allowing publication after real expiry.

Affected surface:
- `src/lib/site-chat-thread.ts`
- same-site Ask Torque reply publication
- site-thread access-expiry enforcement under lock contention

## Independent execution

Challenge-only branch rooted at the exact frozen candidate:
`evidence/2026-10-05-r2-fc01-fresh-rechallenge-expiry`

The challenge branch modified only test/workflow material. The workflow explicitly verified the candidate implementation files were unchanged from `936b9bbd81ac83afc9383cf3b74b806c2ecdcbf3`.

Workflow:
`NorAutoMatch R2 FC-01 Fresh Re-Challenger Expiry Challenge`

Run:
`37395979536`

Job:
`112051905044`

Environment:
- GitHub-hosted Ubuntu 24.04
- Node 22
- PostgreSQL 17
- exact candidate implementation verified unchanged before execution

Pre-challenge gates all passed:
- checkout
- exact-candidate implementation diff verification
- locked dependency installation
- bounded schemas
- TypeScript compile

The challenge execution then failed on the expected invariant.

## Deterministic reproduction

1. Rep B is the current owner of the site-chat conversation.
2. Site-thread access is set to expire in one second.
3. A separate transaction locks the exact `crm_conversation_assignments` row.
4. Rep B starts `publishSiteChatReply()`; its transaction begins while access is still active, then blocks on the ownership row.
5. The challenger waits 1.5 seconds and confirms with `clock_timestamp()` that the access row is expired before releasing the ownership lock.
6. The ownership lock is released.
7. Expected: publication rejects with `SITE_CHAT_REPLY_THREAD_NOT_ACTIVE`.
8. Observed: publication resolves instead of rejecting.

Observed workflow assertion:

`Missing expected rejection: publication must re-evaluate expiry at mutation time after waiting for ownership lock`

The failing assertion occurred only after candidate identity verification, dependency install, schema application, and compilation succeeded.

## Why this is attributable to the frozen candidate

The challenge workflow verified no differences from the frozen candidate in:
- `src/lib/site-chat-thread.ts`
- `src/app/api/manager/conversations/site-reply/route.ts`
- `src/lib/conversation-ownership.ts`
- `infrastructure/norautomatch-conversation-ownership-r0.sql`
- `infrastructure/norautomatch-site-chat-thread-r0.sql`

The defect is therefore attributable to the exact frozen successor implementation, not the test-only challenge branch.

## Safety and authority

- no remediation performed
- no merge
- no production deployment
- no live customer traffic
- no secure-document activation
- no inventory-cache activation
- no Motive/RideMotive execution
- no outbound customer communication
- no secret disclosure

Authority effect: **NONE**

## Fresh Re-Challenger disposition

**FAIL**

Stop at the governed Fresh Re-Challenger failure boundary.

The candidate must not advance to Independent Assurance as a PASS candidate. A separate Remediation Builder should address this new finding and freeze a new exact successor before another separate Fresh Re-Challenger is activated.
