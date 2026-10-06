# NorAutoMatch R2 FRC-01 Expiry Remediation Successor — Fresh Re-Challenger FAIL

Date: 2026-10-05

Repository: `norrijam405/NorAutoMatch`

Remediation PR: #59

Fresh Re-Challenger role: separate adversarial challenger. No remediation performed.

## Exact frozen candidate

- commit: `a3311dac4891efdada833e5fc06d7c42ff7898fd`
- tree: `95afba81c0e51d0d66feb7f81e78506b0ac1cc8e`
- failed predecessor: `936b9bbd81ac83afc9383cf3b74b806c2ecdcbf3`

The challenge branch is rooted directly at the exact frozen successor and adds evidence/test material only.

## Disposition

**FAIL / challenger stop boundary**

New finding:

**NORAUTOMATCH-R2-FC01-FRC-02 — SITE_THREAD_ACCESS_CAN_EXPIRE_AFTER_ELIGIBILITY_CHECK_BEFORE_REPLY_COMMIT**

## What survived challenge

The exact successor materially fixes the prior FRC-01 defect:
- the ownership row is still locked with `FOR UPDATE`
- stale-owner publication remains rejected after ownership transfer
- expiry is evaluated with PostgreSQL `clock_timestamp()` after the ownership lock is acquired
- access that expires while publication is waiting on the ownership lock is rejected

Those repairs do not close the later commit-time expiry window described below.

## Expected invariant

A same-site reply must still have active site-thread access when it is actually inserted/committed. Expiry enforcement must fail closed for the whole publication mutation, not only at one earlier eligibility read.

If access expires after the post-ownership-lock eligibility read but before the reply INSERT can complete, publication must reject and leave no reply.

## Exact-candidate source cause

In `src/lib/site-chat-thread.ts`, `publishSiteChatReply()` performs:

1. begin transaction
2. read eligible conversation event
3. lock current ownership row with `FOR UPDATE`
4. verify current owner
5. query `crm_site_chat_access` with `expires_at > clock_timestamp()`
6. INSERT into `crm_site_chat_replies`
7. commit

The access row is not locked and expiry is not re-evaluated in the INSERT or immediately before COMMIT.

Therefore a publication can pass step 5 while access is active, then block before step 6 long enough for access to expire. Once the blocker is released, the INSERT has no active-access predicate and the transaction can commit.

## Deterministic reproduction

Evidence script:

`scripts/site-chat-thread.frc02-expiry-after-eligibility-check.reproducer.ts`

Challenge construction:

1. Seed an eligible `NORAUTO_SITE_CHAT` event.
2. Seed the current owner.
3. Seed site-thread access expiring in one second.
4. In a separate transaction, acquire `ACCESS EXCLUSIVE` on `crm_site_chat_replies`.
5. Start `publishSiteChatReply()`.
6. The candidate can complete event lookup, ownership `FOR UPDATE`, owner validation, and the active-access SELECT, then blocks only when it reaches the reply INSERT.
7. Wait 1.5 seconds and independently verify `expires_at <= clock_timestamp()`.
8. Release the reply-table blocker.
9. Expected invariant: publication rejects with `SITE_CHAT_REPLY_THREAD_NOT_ACTIVE` and reply count remains zero.
10. Exact candidate control flow: there is no access re-check after the blocker releases, so the INSERT proceeds and the transaction can commit an expired-thread reply.

## Observed result

The exact frozen source contains no condition capable of invalidating publication after the successful access SELECT. PostgreSQL relation locking can delay the subsequent INSERT independently of the already-completed access read. After the blocking lock is released, the candidate executes an unconditional INSERT and COMMIT.

This is an exact source-and-database-sequencing counterexample against the frozen candidate.

No GitHub Actions run was queued by this Fresh Re-Challenger. The reproducer is preserved as an executable specification for an independent PostgreSQL runner.

## Mandatory challenge impact

This finding defeats:
- expiry fail-closed across the full publish mutation
- expired access leaves no insert
- rollback/no-partial-reply guarantee when expiry occurs after eligibility evaluation but before commit

The following remained bounded in source inspection:
- non-owner direct publish fails
- UNASSIGNED or missing assignment fails
- workspace/provider/conversation predicates remain scoped
- route maps ownership/access denials to non-success responses
- no CRM stage/appointment/reservation/finance/lender/SOLD/LOST authority appears
- no external provider/Motive send is introduced

## Affected surface

- `src/lib/site-chat-thread.ts`
- same-site Ask Torque reply publication
- site-thread expiry enforcement between access eligibility read and reply commit

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

The candidate must not advance to Independent Assurance as a PASS candidate. A separate Remediation Builder should address FRC-02 and freeze a new exact successor before another separate Fresh Re-Challenger is activated.
