# NorAutoMatch R2 Broad Release-Candidate Fresh Re-Challenger FAIL — BRC-FRC-10

Date: 2026-10-07

Role: new separate Broad Release-Candidate Fresh Re-Challenger

Repository: `norrijam405/NorAutoMatch`

Frozen candidate challenged: `477595088bbb931a1822dc7b9db0f1743b2a851e`

Frozen tree: `cf7d02bca46905a84af155d3b5a5967dfee084df`

Failed predecessor already remediated before this challenge: `e7463084182089c2cbc0b3fe8732f8b38e5d8966`

Evidence branch: `evidence/r2-site-chat-insert-truth-2026-10-07`

Fresh challenger workflow run: `37627628935`

## Pre-finding regression result

The challenger first re-tested BRC-FRC-09 and inherited BRC-FRC-08 through BRC-FRC-01 before continuing the remaining broad matrix.

PASS before the new finding:
- exact candidate SHA and tree binding;
- governed secure-document production prerequisite;
- real production migration-only bootstrap;
- production presence of ownership, communication-ledger, site-chat migrations, triggers, and functions;
- BRC-FRC-09 missing/arbitrary source-event rejection;
- BRC-FRC-09 DEAD_LETTER rejection;
- BRC-FRC-09 REDACTED rejection;
- BRC-FRC-09 non-owner rejection;
- legitimate current-owner publication;
- deferred access-at-commit guard;
- prior ownership / expiry / revocation race regressions;
- BRC-FRC-08 site-chat production bootstrap;
- BRC-FRC-07 ownership + communication-ledger production bootstrap;
- BRC-FRC-06 verified-provider-receipt truth;
- BRC-FRC-05 communication insert truth;
- BRC-FRC-04 communication-ledger TRUNCATE rejection;
- BRC-FRC-03 communication-ledger UPDATE/DELETE immutability;
- BRC-FRC-02 production v13 customer-opportunity binding bootstrap;
- BRC-FRC-01 secure-document customer/opportunity binding.

## New material finding

`NORAUTOMATCH-R2-BRC-FRC-10 — SITE_CHAT_REPLY_TRUTH_MUTABLE_BY_DIRECT_SQL_UPDATE`

A legitimate current-owner same-site reply was inserted successfully. The challenger then issued a direct SQL UPDATE against the already-published `crm_site_chat_replies` row and rewrote:

- `source_event_id` from the legitimate source event to `arbitrary-rewritten-source`;
- `published_by` from the legitimate owner to `forged-non-owner`;
- `body` from the legitimate published text to forged post-publication content.

The UPDATE succeeded.

The insert-time trigger `crm_site_chat_reply_insert_truth_guard` therefore protects INSERT truth but does not preserve already-published reply truth against later direct SQL mutation.

This creates a provenance/integrity bypass: durable published reply evidence can be rewritten after the event/owner checks have already passed.

## Evidence

Fresh challenger workflow:
- run `37627628935`
- job `112813398066`

The workflow failed intentionally at:
`NORAUTOMATCH-R2-BRC-FRC-10:SITE_CHAT_REPLY_TRUTH_MUTABLE_BY_DIRECT_SQL_UPDATE`

All ordered inherited regressions listed above had passed before this witness executed.

Two earlier challenger runs on the evidence branch were harness corrections only and are not product findings:
- `37627002293`: challenger omitted the governed secure-document bootstrap prerequisite;
- `37627174967`: challenger grouped expected SQL failures in one PostgreSQL transaction, causing transaction-aborted behavior after the first expected rejection.

Corrected FRC-09-only run `37627324903` passed completely.

## Boundary

STOP at first material new finding.

No remediation performed.
No merge performed.
No deployment performed.
No production traffic or provider execution authorized.

State: `BROAD_FRESH_RECHALLENGER_FAIL / REMEDIATION_REQUIRED / NO_PRODUCTION_AUTHORITY`
