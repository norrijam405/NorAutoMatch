# NorAutoMatch R2 FRC-03 Access Commit Guard — Independent Assurance PASS

Date: 2026-10-05

Repository: `norrijam405/NorAutoMatch`

PR: `#61 — R2 FRC-03 remediation — lock site-thread access through commit`

## Exact frozen candidate

- commit: `1c37dc6c389ac8531f1d3cbd78a3d28a4f8e4448`
- tree: `d5f52430d4b92429d5e936550437e94c0cdc46b1`
- failed predecessor: `3e2a612decade0c953f4c2202ce507430026bd25`
- base tree: `345ec780c28b5ae04381b3960f1d7dc040830d12`

Exact commit/tree identity was independently resolved through the Git commit API. The commit points to tree `d5f52430d4b92429d5e936550437e94c0cdc46b1`.

## Independent Assurance disposition

**PASS / FRC-03 REMEDIATION LINEAGE ASSURED FOR THIS FROZEN CANDIDATE**

No material counterexample was found within the governed assurance scope.

No remediation was performed.

## Assurance environment

- exact GitHub-frozen commit/tree inspection
- exact candidate source and PostgreSQL schema inspection
- exact predecessor-to-candidate comparison
- PR #61 body/discussion inspection
- IgniAqua Control Plane issue #29 lineage reconstruction
- Node.js available locally: `v22.16.0`
- local PostgreSQL server/client unavailable in this runtime: no `psql`, `postgres`, or `initdb`
- no GitHub Actions run was queued or rerun
- existing exact-head Builder PostgreSQL workflow run `37407072582` was inspected as corroborating execution evidence

## Defect-lineage reconstruction

1. **FC-01 — stale owner after ownership transfer**
   - Original defect: manager authorization could succeed for owner A, ownership could transfer to B, then A could still publish.
   - Preserved fix: `publishSiteChatReply()` locks the exact `crm_conversation_assignments` row with `FOR UPDATE` and validates `ASSIGNED` + `assignee_subject_id === publishedBy` inside the publication transaction.

2. **FRC-01 — expiry during ownership-lock wait**
   - Original defect: transaction-start `current_timestamp` could make an expired access row appear active after a lock wait.
   - Preserved fix: access activity uses PostgreSQL `clock_timestamp()` after the ownership lock is acquired.

3. **FRC-02 — expiry after eligibility check before reply commit**
   - Original defect: access could expire after a positive eligibility SELECT while reply INSERT was blocked.
   - Preserved fix: publication locks the access row and the deferred constraint trigger rechecks existence/expiry at commit using `clock_timestamp()`; commit failure rolls back the reply INSERT.

4. **FRC-03 — revocation after final positive query before commit**
   - Original defect: the predecessor's final positive access query was not coupled to COMMIT; concurrent revocation could commit before publication consumed the positive result.
   - Final fix: publication acquires `FOR UPDATE` on the exact `crm_site_chat_access` row and holds it through commit. Concurrent DELETE/UPDATE revocation serializes behind publication. The deferred commit trigger rechecks the same row before commit completes.

## Independent checks

### Transaction and lock ordering

**PASS.**

Observed publication order:

1. `BEGIN`
2. event lookup bounded by workspace/provider/event
3. assignment row `FOR UPDATE`
4. current-owner validation
5. access row `FOR UPDATE`
6. access activity check with `clock_timestamp()`
7. reply INSERT
8. deferred `crm_site_chat_reply_access_commit_guard`
9. COMMIT or rollback

The deferred trigger re-selects the same access row `FOR UPDATE` in the same transaction. This is compatible with the lock already held by publication and does not introduce a second competing lock order.

### Stale ownership transfer

**PASS.**

Ownership transfer/claim/release paths lock only the assignment row. If publication owns the assignment lock first, transfer waits. If transfer commits first, publication observes the new owner under READ COMMITTED and fails with `SITE_CHAT_REPLY_CURRENT_OWNER_REQUIRED`.

### Expiry during assignment-lock wait

**PASS.**

The active-access expression is evaluated with `clock_timestamp()` only after publication acquires the assignment lock. The FRC-01 transaction-start timestamp defect remains closed.

### Expiry during blocked reply INSERT

**PASS.**

Publication can hold the access-row lock while waiting on the reply INSERT. If wall-clock expiry occurs while blocked, the deferred trigger executes at commit and rejects the transaction with `SITE_CHAT_REPLY_THREAD_NOT_ACTIVE`. The inserted reply is not durably committed.

### Concurrent access-row revocation

**PASS.**

DELETE/UPDATE of the access row requires a conflicting row lock and cannot commit while publication owns `FOR UPDATE`. If revocation commits first, publication's locking SELECT observes the committed missing/updated state and fails closed. If publication locks first, revocation serializes after publication.

### Access expiry at deferred commit-trigger time

**PASS.**

The trigger compares `expires_at` against `clock_timestamp()` at commit-time execution, not transaction start, closing the pure passage-of-time case even without a concurrent UPDATE.

### Rollback leaves no partial reply

**PASS by exact control-flow and PostgreSQL transaction semantics, corroborated by exact-head CI.**

A deferred-trigger exception raised during `COMMIT` aborts the transaction. `publishSiteChatReply()` enters its catch path, attempts rollback handling, propagates failure, and no reply INSERT becomes durable.

### Valid owner + active access

**PASS.**

Successful same-site publication remains available and returns:
- `deliveryChannel: NORAUTO_SITE_THREAD`
- `externalDelivery: NOT_PERFORMED`
- `authorityEffect: NONE`

### Deadlock / lock-order inversion

**PASS within inspected candidate surfaces.**

Publication acquires assignment then access. Claim/release ownership paths acquire assignment only. Site-access registration/read paths do not acquire assignment locks. No inspected path acquires access then assignment, so the FRC-03 change does not introduce an opposing two-row lock order.

### Access deletion/update bypass

**PASS.**

Concurrent access DELETE/UPDATE cannot bypass publication's row lock. Pure expiry without a mutation is separately covered by the deferred `clock_timestamp()` guard.

### Workspace/provider/conversation isolation

**PASS.**

- event lookup: workspace + provider + event
- ownership: workspace + provider + conversation
- access/reply: workspace + conversation
- manager workspace comes from authenticated manager claims
- public thread read is fixed to workspace `norautomatch` and conversation-scoped

No remediation change broadens these predicates.

### Same-site token/read isolation

**PASS.**

Public thread reads:
- require same-origin `Origin`
- validate bounded access-token syntax
- hash the opaque token
- use timing-safe hash comparison
- enforce expiry
- return only the requested workspace/conversation's published replies
- retain `externalDelivery: NOT_PERFORMED` and `authorityEffect: NONE`

### Manager route error mapping

**PASS.**

The manager site-reply route maps current-owner failure and thread eligibility/activity failure to non-success `409`; unknown transaction failures fail closed as `503`.

### Authority boundary

**PASS.**

The predecessor-to-candidate delta is limited to:
- FRC-03 CI
- site-thread SQL commit guard
- FRC-03 regression harness
- site-thread publication locking logic
- site-thread test configuration

No new CRM stage, appointment, reservation, financing, lender, SOLD, LOST, secure-document, inventory-cache, provider-send, or Motive/RideMotive authority was introduced.

### External execution

**PASS.**

The site-reply path remains same-site only. Publication receipts explicitly report `externalDelivery: NOT_PERFORMED`. Ask Torque intake reports `responseExecution: NOT_PERFORMED` and `authorityEffect: NONE`.

## Exact-head corroborating PostgreSQL execution

Existing workflow:

- run: `37407072582`
- workflow: `NorAutoMatch R2 FRC-03 Access Commit Guard Remediation CI`
- head SHA: `1c37dc6c389ac8531f1d3cbd78a3d28a4f8e4448`
- head tree: `d5f52430d4b92429d5e936550437e94c0cdc46b1`
- conclusion: **success**

Successful steps included:
- locked dependency installation
- production dependency security gate
- bounded schema application on PostgreSQL 17
- TypeScript verification compile
- historical ownership + expiry race challenge
- exact FRC-02 blocked-INSERT expiry challenge
- FRC-03 revocation serialization challenge
- application typecheck
- production build

This run is corroborating Builder evidence, not a substitute for this assurance review.

## Known limitation

This Independent Assurance runtime did **not** have a local PostgreSQL server/client, so it could not satisfy the preferred second independent PostgreSQL execution of the concurrency matrix. No GitHub Actions run was queued or rerun.

The PASS therefore rests on:
- independently verified exact commit/tree identity
- exact-source and exact-SQL concurrency analysis
- independent defect-lineage reconstruction
- lock-order and mutation-path inspection
- route/isolation/authority inspection
- exact-head predecessor comparison
- corroboration from the already-completed PostgreSQL 17 exact-head run `37407072582`

This limitation is explicit and does not get relabeled as independent PostgreSQL execution.

## Safety / authority

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

## Final disposition

**INDEPENDENT_ASSURANCE_PASS**

Exact frozen candidate:
`1c37dc6c389ac8531f1d3cbd78a3d28a4f8e4448`

Tree:
`d5f52430d4b92429d5e936550437e94c0cdc46b1`

This PASS closes the governed FC-01 / FRC-01 / FRC-02 / FRC-03 remediation assurance lineage for this frozen candidate.

This PASS does **not** by itself authorize merge, production deployment, customer traffic, or other operational activation.

**Next governed role: Release Reconciliation / Production Activation Decision.**
