# NorAutoMatch R2 FRC-02 Commit-Time Expiry Remediation — Fresh Re-Challenger FAIL

Date: 2026-10-05

Repository: `norrijam405/NorAutoMatch`

Remediation PR: #60

Fresh Re-Challenger role: separate adversarial challenger. No remediation performed.

## Exact frozen candidate

- commit: `3e2a612decade0c953f4c2202ce507430026bd25`
- tree: `345ec780c28b5ae04381b3960f1d7dc040830d12`
- failed predecessor: `a3311dac4891efdada833e5fc06d7c42ff7898fd`

The challenge branch is rooted directly at the exact frozen successor and contains challenge/evidence material only.

## Disposition

**FAIL / challenger stop boundary**

New finding:

**NORAUTOMATCH-R2-FC01-FRC-03 — SITE_THREAD_ACCESS_REVOCATION_AFTER_FINAL_QUERY_CAN_COMMIT_REPLY**

## What survived challenge

The frozen successor materially improves FRC-02:
- original current-owner `FOR UPDATE` protection remains present
- the post-ownership-lock wall-clock expiry check remains present
- a second `clock_timestamp()` access query now occurs after reply INSERT
- if access is already absent/expired when that second query executes, the transaction throws and rolls back
- the exact prior blocked-INSERT FRC-02 counterexample is therefore closed

The new finding is at a later boundary: after the final query has produced a positive result but before the application consumes that result and commits.

## Expected invariant

Revoked or expired site-thread access must fail closed through the actual publication commit boundary.

A successful eligibility query is not itself authority to commit after the underlying access has been revoked. If access is revoked after the final database eligibility query evaluates but before `publishSiteChatReply()` receives that result and issues `COMMIT`, publication must not commit a reply.

## Exact-candidate source cause

In `src/lib/site-chat-thread.ts`, the frozen candidate performs:

1. begin transaction
2. event eligibility read
3. ownership row `FOR UPDATE`
4. current-owner verification
5. first active-access SELECT
6. reply INSERT
7. second active-access SELECT using `expires_at > clock_timestamp()`
8. inspect the returned `rowCount`
9. unconditional `COMMIT`

The second SELECT does not lock the access row with `FOR SHARE`/`FOR UPDATE`, and there is no database constraint/predicate binding access existence to the reply commit.

PostgreSQL row deletion/revocation can therefore commit after the second SELECT has evaluated while the positive query result is still in transit or otherwise delayed before application consumption. The already-completed query result remains `rowCount === 1`; candidate code then commits without any third observation.

## Deterministic reproduction

Challenge evidence:

`scripts/site-chat-thread.frc03-revocation-after-final-check.reproducer.ts`

The reproducer does not modify candidate product code. It wraps only the Pool client boundary in order to deterministically delay delivery of the already-completed final access-query result.

Sequence:

1. Seed an eligible `NORAUTO_SITE_CHAT` event.
2. Seed a valid current owner.
3. Seed active site-thread access.
4. Execute the exact frozen `publishSiteChatReply()`.
5. Allow the first access query, reply INSERT, and second/final access query to execute normally against PostgreSQL.
6. Confirm the final access query returned one active row.
7. Before returning that already-completed QueryResult to candidate application code, delete the exact `crm_site_chat_access` row through a separate real pool connection and commit the revocation.
8. Confirm the access row is absent.
9. Return the original positive final-query result to `publishSiteChatReply()`.
10. Expected: publication rejects and rolls back because access is now revoked.
11. Candidate control flow: it consumes the stale positive `rowCount` and immediately executes `COMMIT`, because no access lock or further revalidation exists.

The reproducer asserts rejection with `SITE_CHAT_REPLY_THREAD_NOT_ACTIVE`; the exact frozen control flow instead permits resolution and committed reply publication.

## Why the final recheck does not close this case

The remediation establishes freshness at the instant the second SELECT is evaluated. It does not make that freshness durable until commit.

A positive query result is ordinary application data. Without locking the access row or moving the validity predicate into a database operation whose commit semantics are coupled to the reply mutation, concurrent revocation can occur after query evaluation and before commit.

## Mandatory challenge impact

This finding defeats:
- access validity through the actual commit boundary
- revocation fail-closed when revocation occurs after the final query evaluates
- rollback/no-partial-reply guarantee for that timing window

The exact source still shows:
- original stale-owner ownership lock present
- FRC-01 wall-clock expiry check present
- FRC-02 post-insert recheck present
- non-owner, UNASSIGNED, and missing assignment paths fail closed
- route maps ownership/access denial errors to non-success
- workspace/provider/conversation predicates remain bounded
- same-site replies advertise `externalDelivery: "NOT_PERFORMED"`
- `authorityEffect: "NONE"`
- no CRM stage/appointment/reservation/finance/lender/SOLD/LOST authority introduced
- no external provider/Motive send introduced

Builder context also reports the production dependency security gate green with `source-map-js@1.2.2`; that Builder result is context only and is not the Fresh Re-Challenger conclusion.

## Challenge environment and limitation

This Fresh Re-Challenger inspected the exact GitHub-frozen source and preserved a deterministic PostgreSQL executable specification on a branch rooted at the exact candidate.

No new GitHub Actions run was required to establish the control-flow counterexample, and no production/customer environment was touched.

## Affected surface

- `src/lib/site-chat-thread.ts`
- same-site Ask Torque reply publication
- site-thread access revocation/expiry semantics between final eligibility-query evaluation and commit

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

The candidate must not advance to Independent Assurance as a PASS candidate. A separate Remediation Builder should address FRC-03 and freeze a new exact successor before another separate Fresh Re-Challenger is activated.
