# NorAutoMatch R2 Broad Release-Candidate Fresh Re-Challenger FAIL after BRC-FRC-03

Role: separate Broad Release-Candidate Fresh Re-Challenger  
Repository: `norrijam405/NorAutoMatch`  
Frozen successor: `b3cc4b6259c2f96c50bfb05817010fad5b0aacd7`  
Tree: `a3eaad17d87a64277d198d5d3b2488f365fee074`  
Failed predecessor: `3e79e151f4851c48955ffbaf8c674958dee58bd7`

## Binding

Git commit object for the frozen successor resolves exactly to tree `a3eaad17d87a64277d198d5d3b2488f365fee074`.

The successor is 3 commits ahead / 0 behind the failed predecessor. The only changed files are:

- `.github/workflows/norautomatch-r2-communication-ledger-ci.yml`
- `infrastructure/norautomatch-conversation-communication-ledger-r0.sql`
- `scripts/conversation-communication-ledger.integration.ts`

No BRC-FRC-02 production-startup-v13 or BRC-FRC-01 secure-document/opportunity-binding implementation files changed from the predecessor that passed those required re-tests.

## Required BRC-FRC-03 re-test

Disposition: PASS for the remediated witness.

Exact frozen schema defines `crm_conversation_contact_events_immutable` as a `BEFORE UPDATE OR DELETE ... FOR EACH ROW` trigger invoking `norautomatch_reject_communication_evidence_mutation()`.

Exact frozen integration test asserts:

- direct SQL UPDATE of committed delivery evidence is rejected with the append-only error;
- direct SQL DELETE of the committed evidence row is rejected;
- the surviving evidence reference remains `synthetic-provider-delivery-receipt-001`;
- delivery outcome remains `DELIVERED`;
- normal append-only inserts and communication-history reads continue to work.

Exact-head workflow run `37447438357`, job `112215549736`, completed SUCCESS, including schema application, communication truth-model challenge, typecheck, production dependency audit, and production build.

## Required BRC-FRC-02 and BRC-FRC-01 regression re-test

Disposition: PASS by frozen-tree regression identity plus prior exact runtime proof.

The predecessor `3e79e151...` passed BRC-FRC-02 and BRC-FRC-01 before BRC-FRC-03 was discovered. Comparing predecessor to successor shows the FRC-03 remediation touched only the three communication-ledger files listed above. Therefore the startup-v13 migration path and secure-document/opportunity-binding enforcement surfaces are byte-identical to the exact predecessor that passed those checks.

## First new material finding

**NORAUTOMATCH-R2-BRC-FRC-04 — COMMUNICATION_EVIDENCE_LEDGER_TRUNCATE_BYPASSES_APPEND_ONLY_GUARD**

The frozen successor still does not enforce database-level append-only semantics against `TRUNCATE`.

The schema creates only:

`BEFORE UPDATE OR DELETE ... FOR EACH ROW`

on `crm_conversation_contact_events`. PostgreSQL treats `TRUNCATE` as a distinct trigger event and only permits TRUNCATE triggers at statement level. Therefore the current row trigger does not fire for `TRUNCATE crm_conversation_contact_events`.

The schema also contains no `BEFORE TRUNCATE ... FOR EACH STATEMENT` rejection trigger and no privilege hardening that revokes TRUNCATE from the table owner/runtime database role. The dedicated CI uses role `norauto` to create the table and then exercises the application through that same database identity, demonstrating the verification surface is table-owner-capable.

Impact: a database principal with TRUNCATE authority can erase all committed communication evidence while the table continues to be described and surfaced as append-only. This defeats the durable-evidence invariant at the database boundary even though direct row UPDATE and DELETE are now blocked.

Reference semantics: PostgreSQL CREATE TRIGGER documents TRUNCATE as a separate event and states that TRUNCATE triggers may only be FOR EACH STATEMENT.

## Disposition

**BROAD_RELEASE_CANDIDATE_FRESH_RECHALLENGER_FAIL / REMEDIATION_REQUIRED / NO_PRODUCTION_AUTHORITY**

Stopped at the first new material finding.

No remediation, merge, deploy, production activation, live traffic, provider execution, outbound communication, or customer-data mutation was performed.
