# NorAutoMatch R2 Broad Release-Candidate Fresh Re-Challenger FAIL after BRC-FRC-06

Date: 2026-10-06

Repository: `norrijam405/NorAutoMatch`

Role: new separate Broad Release-Candidate Fresh Re-Challenger

Exact frozen candidate challenged:
- commit: `ae1789d81cf0cffcec2f31ed6be9a20f0489b3e8`
- tree: `9a3649805c6c0d61a8abe85bc920f51c6277c735`
- failed predecessor: `1f23d99b9142051ecdb3aa6b5aac6e92f2371ac6`

Evidence branch:
`evidence/r2-provider-receipt-truth-2026-10-06`

## Required repaired witnesses first

BRC-FRC-06: PASS on the exact frozen successor evidence surface.
- Exact-head workflow `37510257627` is SUCCESS.
- Application-path rep-entered arbitrary provider receipt text is rejected with `COMMUNICATION_VERIFIED_PROVIDER_RECEIPT_REQUIRED`.
- Direct-SQL `DELIVERY_EVIDENCE_RECORDED` is rejected, including after a valid outbound execution.
- Delivery state remains `NOT_CLAIMED`.
- Seeded legacy rep-reported delivery rows are surfaced as `UNVERIFIED_REP_REPORTED_REFERENCE` and do not alter delivery state.
- Manager UI exposes no manual delivery-claim control.
- UPDATE, DELETE, and TRUNCATE protections remain exercised by the exact-head integration.
- `package.json` pins the `sharp` override to `0.35.5`, and the exact-head workflow production dependency security gate passed.

BRC-FRC-05, BRC-FRC-04, BRC-FRC-03: PASS/regression-covered by the same exact-head communication-ledger workflow and integration surface.

BRC-FRC-02 and BRC-FRC-01: unchanged by the successor delta in their governed runtime surfaces. The successor is 9 commits ahead / 0 behind the failed predecessor; the delta is limited to the communication-ledger workflow/schema/integration/runtime/UI plus `package.json` and `package-lock.json`. The previously repaired v13 production-startup and secure-document binding surfaces are unchanged.

## First new material finding

**NORAUTOMATCH-R2-BRC-FRC-07 — PRODUCTION_STARTUP_OMITS_COMMUNICATION_LEDGER_SCHEMA_AND_FRC06_TRUTH_GUARD**

The repaired BRC-FRC-06 CI is not a production-startup proof.

The exact-head workflow `.github/workflows/norautomatch-r2-communication-ledger-ci.yml` manually installs:

`infrastructure/norautomatch-conversation-communication-ledger-r0.sql`

before running the communication truth challenges.

However, the exact frozen production launcher `scripts/start-production.mjs` hard-codes only CRM migrations v1 through v13. It does **not** include the communication-ledger schema. An exact-candidate cross-check of all 13 production-listed migrations confirms that none defines `crm_conversation_contact_events` or `norautomatch_enforce_communication_evidence_insert_truth`.

Consequences:
1. A fresh database started through the normal production migration launcher does not receive the communication ledger table required by `recordCommunicationAction()` / `readCommunicationHistory()`.
2. A database that already has an older communication-ledger schema is not upgraded by the normal production migration launcher to the BRC-FRC-06 fail-closed insert-truth guard.
3. Therefore exact-head CI can be green while the production bootstrap path lacks the very schema/trigger whose remediation is being relied upon for release safety.

This is the same class of release-path mismatch previously treated as material in BRC-FRC-02: a dedicated CI manually applies a migration/schema that the normal production startup path omits.

No remediation performed.

No merge, deploy, production activation, live traffic, provider execution, or outbound communication performed.

State:
**BROAD_RELEASE_CANDIDATE_FRESH_RECHALLENGER_FAIL / REMEDIATION_REQUIRED / NO_PRODUCTION_AUTHORITY**

Stopped at the first material new finding.
