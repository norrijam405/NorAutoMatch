# NorAutoMatch R2 FRC-03 Access Commit Guard Remediation — Fresh Re-Challenger PASS

Date: 2026-10-05

Repository: `norrijam405/NorAutoMatch`

Fresh Re-Challenger role: separate adversarial challenger. No remediation performed.

## Exact frozen candidate

- commit: `1c37dc6c389ac8531f1d3cbd78a3d28a4f8e4448`
- tree: `d5f52430d4b92429d5e936550437e94c0cdc46b1`
- failed predecessor: `3e2a612decade0c953f4c2202ce507430026bd25`

The candidate identity was independently resolved through the Git tree API. The exact tree returned `d5f52430d4b92429d5e936550437e94c0cdc46b1`.

## Disposition

**PASS / FRC-03 CLOSED FOR THIS FROZEN CANDIDATE / INDEPENDENT ASSURANCE NEXT**

No new material counterexample was found within the governed Fresh Re-Challenger scope.

## Required starting evidence reviewed

- prior FRC-03 finding receipt:
  `receipts/NORAUTOMATCH_R2_FC01_FRC02_COMMIT_EXPIRY_REMEDIATION_FRESH_RECHALLENGER_FAIL_2026-10-05.md`
- Remediation Builder exact-head PASS receipt:
  `receipts/NORAUTOMATCH_R2_FC01_FRC03_ACCESS_COMMIT_GUARD_REMEDIATION_EXACT_HEAD_PASS_2026-10-05.md`
- PR #61 body and discussion
- IgniAqua Control Plane issue #29 and lineage comments
- exact frozen source for:
  - `src/lib/site-chat-thread.ts`
  - `infrastructure/norautomatch-site-chat-thread-r0.sql`
  - manager site-reply route
  - same-site thread read route
  - Ask Torque intake route
  - FC-01/FRC-01/FRC-02 regression harnesses
  - FRC-03 remediation harness

## Challenge environment

- exact GitHub-frozen commit/tree inspection
- GitHub Git tree identity verification
- exact-source transactional/locking analysis against PostgreSQL row-lock and deferred-trigger semantics
- Node.js available locally: v22.16.0
- no local PostgreSQL server/client was available in the challenger runtime
- GitHub Actions usage was not queued or rerun, per activation boundary
- existing Builder run `37407072582` was inspected only as context; every job step was completed with conclusion `success`, including the production dependency security gate

## Mandatory challenge matrix

### 1. Original stale-owner transfer race

**PASS.**

Publication locks the exact `crm_conversation_assignments` row with `FOR UPDATE` before validating `ASSIGNED` + `assignee_subject_id === publishedBy`. Ownership transfer cannot commit ahead of publication after publication owns that row lock; if transfer commits first, the post-wait read observes the new owner and fails closed.

### 2. Expiry while waiting on ownership lock

**PASS.**

Access activity is evaluated only after the ownership lock is acquired, using `clock_timestamp()`, not transaction-start `current_timestamp`. The historical FC-01/FRC-01 race remains closed.

### 3. Expiry after initial access check while reply INSERT is blocked

**PASS.**

Publication holds `FOR UPDATE` on the exact access row, and the deferred constraint trigger re-evaluates `expires_at <= clock_timestamp()` at commit. An access row that expires while the INSERT is blocked causes COMMIT to fail with `SITE_CHAT_REPLY_THREAD_NOT_ACTIVE`; the transaction rolls back.

### 4. Revocation after positive access read

**PASS.**

Once publication acquires the access-row `FOR UPDATE` lock, concurrent DELETE/UPDATE revocation must serialize behind publication. The FRC-03 stale positive QueryResult window no longer exists because revocation cannot commit between access read and reply commit.

### 5. Revocation committed before publication acquires access lock

**PASS.**

Under PostgreSQL READ COMMITTED statement semantics, the `SELECT ... FOR UPDATE` either sees no access row after a committed DELETE or sees the updated expired row after a committed revocation update. Candidate then fails `SITE_CHAT_REPLY_THREAD_NOT_ACTIVE`.

### 6. Access expiration while publication holds access-row lock

**PASS.**

The deferred `crm_site_chat_reply_access_commit_guard` executes at transaction commit and compares the locked row's `expires_at` to `clock_timestamp()`. Expiry is therefore checked at the commit boundary rather than only at an earlier application observation.

### 7. Access deletion/revocation while publication is blocked before access-lock acquisition

**PASS.**

If the competing mutation commits first, publication's subsequent locking SELECT observes the committed state and fails closed. If publication acquires the row lock first, the competing mutation serializes after publication rather than invalidating an already-authorized commit mid-flight.

### 8. Valid owner + valid active access

**PASS.**

The exact product path preserves successful same-site publication and returns `deliveryChannel: NORAUTO_SITE_THREAD`, `externalDelivery: NOT_PERFORMED`, and `authorityEffect: NONE`.

### 9. Non-owner direct publish

**PASS.**

Mismatch between locked assignment owner and `publishedBy` throws `SITE_CHAT_REPLY_CURRENT_OWNER_REQUIRED`.

### 10. UNASSIGNED / missing assignment

**PASS.**

Missing assignment, non-`ASSIGNED` state, or null/different assignee fails the same current-owner gate before any reply INSERT.

### 11. Rollback after deferred-trigger failure

**PASS by transaction control-flow inspection.**

A deferred-trigger exception occurs during `COMMIT`; `publishSiteChatReply()` enters the catch path and issues rollback handling before propagating the failure. The reply INSERT is not durably committed when the deferred trigger rejects the transaction.

### 12. Lock leak / deadlock after ownership or access failure

**PASS within inspected path.**

All transaction exits run through catch/finally; the client is released. Failed ownership/access checks roll back. The publication lock order is assignment row then access row and no contradictory lock order was introduced by the FRC-03 remediation path or its commit trigger.

### 13. Cross-workspace/provider/conversation isolation

**PASS.**

Event lookup is bounded by workspace/provider/event. Ownership is bounded by workspace/provider/conversation. Access/reply operations are bounded by workspace/conversation. No broader predicate was introduced by the remediation.

### 14. Same-site read/token isolation

**PASS.**

Thread reads remain same-origin gated, fixed to workspace `norautomatch`, conversation-scoped, token-hash verified with timing-safe equality, and expiration checked before reply read. FRC-03 product changes do not widen that surface.

### 15. Route error mapping

**PASS.**

Manager site-reply route maps `CURRENT_OWNER_REQUIRED` and `NOT_ELIGIBLE` / `NOT_ACTIVE` to non-success 409 responses. Unknown transaction failures remain fail-closed as 503.

### 16. No CRM stage/appointment/reservation/finance/lender/SOLD/LOST authority

**PASS.**

The remediation changes only access serialization, commit guarding, regression coverage, and CI. Reply receipt remains `authorityEffect: NONE`.

### 17. No external provider / Motive send

**PASS.**

The publication receipt explicitly remains `externalDelivery: NOT_PERFORMED`; no external provider execution was introduced.

### 18. Production dependency security gate

**PASS as inspected evidence context.**

Existing exact-head workflow run `37407072582` is bound to the frozen SHA and tree. Its production dependency security gate step completed successfully, as did schema application, regression tests, typecheck, and production build. No new workflow run was queued or rerun.

## Known limitations

- This Fresh Re-Challenger did not execute an independent PostgreSQL runtime because the available local runtime contains Node.js v22.16.0 but no PostgreSQL client/server, and the activation explicitly prohibited queueing/rerunning GitHub Actions.
- Existing Builder CI was therefore treated as corroborating execution evidence only, not as the challenger conclusion.
- The PASS conclusion is based on exact-candidate identity verification, exact-source inspection, adversarial concurrency/serialization analysis, route isolation inspection, and inspection of the already-completed exact-head run.
- Independent Assurance should re-execute the commit-time expiry/revocation cases in an independent PostgreSQL runtime if available.

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

Authority effect: **NONE**.

## Fresh Re-Challenger disposition

**PASS**

FRC-03 is closed for exact candidate `1c37dc6c389ac8531f1d3cbd78a3d28a4f8e4448` / tree `d5f52430d4b92429d5e936550437e94c0cdc46b1` within the governed challenge scope.

This PASS does **not** authorize production, merge, deployment, customer traffic, or any other operational activation.

**Next role: Independent Assurance.**
