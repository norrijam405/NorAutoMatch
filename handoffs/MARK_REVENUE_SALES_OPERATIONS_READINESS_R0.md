# Mark — NorAutoMatch Revenue & Sales Operations Readiness R0

**Mission:** `MARK-FIELD-001`  
**Role:** Mark — Revenue Systems & Sales Lead  
**Date:** 2026-10-06  
**Disposition:** `FIELD_HANDOFF_COMPLETE / CURRENT_R2_CANDIDATE_NOT_RELEASE_AUTHORIZED`

## Evidence binding

Activation named PR #67 candidate:

- PR #67: `R2 BRC-FRC-05 remediation — enforce communication insert truth`
- frozen candidate: `1f23d99b9142051ecdb3aa6b5aac6e92f2371ac6`
- tree: `485464c7e187aa5da13a121c5165fc9927dcb5ab`
- canonical production base: `71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`

PR #67's broad re-challenge later failed on `NORAUTOMATCH-R2-BRC-FRC-06`: after valid outbound execution, a rep-entered arbitrary provider receipt reference could still mint delivery truth.

Current durable successor inspected for this handoff:

- PR #68: `R2 BRC-FRC-06 remediation — fail closed on unverified provider receipts`
- frozen successor: `ae1789d81cf0cffcec2f31ed6be9a20f0489b3e8`
- tree: `9a3649805c6c0d61a8abe85bc920f51c6277c735`
- direct base: PR #67 candidate `1f23d99b9142051ecdb3aa6b5aac6e92f2371ac6`
- canonical production base remains merge base; builder evidence reports 190 commits ahead / 0 behind
- builder exact-head PASS: workflow run `37510257627`
- current state: `REMEDIATION_BUILDER_PASS / BROAD_FRESH_RECHALLENGE_REQUIRED / NO_PRODUCTION_AUTHORITY`

This field branch is intentionally based on `ae1789d81cf0cffcec2f31ed6be9a20f0489b3e8`, the newer frozen successor, so the revenue-readiness view does not preserve the already-known FRC-06 defect as the latest candidate behavior.

## Executive operating answer

### `VERIFIED_CANDIDATE`

The current R2 successor can support a **human-operated sales desk workflow** in candidate form:

1. present a bounded conversation-response queue with customer/intent context and response SLA status;
2. let one authenticated operator self-claim or release conversation ownership;
3. keep ownership separate from sales authority;
4. enforce communication-consent and preferred-channel gates before human external-contact actions can be recorded;
5. open the customer's preferred external app as a handoff only;
6. record append-only evidence that a human says an outbound execution occurred;
7. retain durable communication history while continuing to report delivery and customer-reached state as unclaimed;
8. support an owned same-site NorAutoMatch reply path for an active site thread;
9. expose customer deal-prep/document-readiness state without exposing raw secure-document bytes to agents;
10. require an exact authenticated customer-to-opportunity binding before a secure document can be linked to a CRM opportunity;
11. keep manager review, lender submission, financing approval, deal approval, and terminal sales outcomes behind separate authority/evidence boundaries;
12. maintain follow-up obligations/urgency and evidence-backed first-contact state transitions.

### `PRODUCTION_STATUS_UNKNOWN_OR_NOT_DEPLOYED`

The R2 revenue-operations capabilities above must **not** be presented as production-deployed truth.

The current successor is a draft remediation candidate, has no production authority, and still requires a separate broad fresh re-challenge. The canonical production base is `71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`; the R2 successor is materially ahead of it and has not been merged or deployed by this mission.

An older repository receipt separately records a verified-live public showcase/inventory deployment, but that does not prove these current R2 CRM, conversation, secure-document, or communication-ledger behaviors are live.

## Sales workflow mapping

| Sales step | Current candidate support | Human/system boundary |
| --- | --- | --- |
| New conversation enters desk | Queue read model can surface contactable or human-review-required conversations, customer/intent context, warning/target timestamps, and SLA state. | `VERIFIED_CANDIDATE` assist only; queue state has `authorityEffect: NONE`. |
| Rep takes responsibility | Rep can self-claim; another subject cannot silently take an assigned conversation. Release is explicit and assignment events are preserved. | `HUMAN_GATE` for who owns the work. Ownership does not imply contact, appointment, reservation, financing, SOLD, or LOST. |
| Decide whether contact is allowed | Communication path requires current ownership, proven communication consent, preferred contact channel, and an available target. | `VERIFIED_CANDIDATE` gating. Missing consent/channel/target blocks the action. |
| Draft/contact customer externally | UI can prepare a human-reviewed message and open `mailto:`, `sms:`, or `tel:` for the preferred channel. | `HUMAN_GATE`. Opening the external app is not a send. NorAutoMatch does not possess provider-send authority here. |
| Record that the rep acted | Rep can record bounded execution evidence after the human action. History is append-only and identifies actor/channel/target hint/evidence ref. | `VERIFIED_CANDIDATE` evidence only. It does not prove delivery or customer reach. |
| Record delivery | Current successor fails closed on rep-entered provider receipt claims. Legacy rep-reported delivery rows are treated as unverified references and do not change delivery state. | `NOT_AUTHORIZED` until a separately governed provider-verification path exists. |
| Reply inside NorAutoMatch site thread | Current owner can publish a reply only for `NORAUTO_SITE_CHAT` while the site-thread access window is active. | `VERIFIED_CANDIDATE`; external delivery remains `NOT_PERFORMED`. Any real customer use remains behind release/customer-contact authority. |
| Manage follow-up | System can maintain first-contact/follow-up obligations, urgency, due-event evidence, and record an evidence-backed first-contact attempt. | `VERIFIED_CANDIDATE`; an attempt is not customer reach. Evidence-backed command may move `NEW -> CONTACT_PENDING`, but this mission is `NOT_AUTHORIZED` to perform CRM stage movement. |
| Build deal-prep packet | Customer workspace can summarize saved vehicles, secure-document counts/status, and desk linkage. | `VERIFIED_CANDIDATE` read/assist behavior; lender submission is `NOT_PERFORMED`, financing approval is `NOT_CLAIMED`. |
| Link secure documents to a deal | Exact workspace/opportunity/authenticated-customer binding is required; cross-customer binding is refused. Raw document/storage refs are not exposed to agents/Torque. | `VERIFIED_CANDIDATE` boundary. No credit pull, lender submission, or public sensitive-document exposure is authorized. |
| Manager review / close | Readiness can become `READY_FOR_MANAGER_REVIEW`; deal approval remains `MANAGER_REQUIRED`. | `HUMAN_GATE`. Candidate does not grant Mark or a rep approval/finance/terminal-outcome authority. |

## What the rep/operator should do manually

A rep remains responsible for human judgment and consequential execution:

- claim the conversation before acting;
- read the customer's actual question, intent, consent state, preferred channel, and available evidence;
- write/review the outbound message;
- perform the phone/email/text action in the external provider/app when authorized;
- record only evidence that actually exists;
- never translate a handoff-open event into a send claim;
- never translate an execution record into delivery or customer-reached truth;
- perform the actual needs analysis, objection handling, appointment setting, vehicle discussion, trade conversation, and closing work;
- escalate manager/deal/finance decisions to the authorized human;
- treat document-readiness as preparation for review, not lender or finance approval.

The system can assist with queue ordering, SLA visibility, ownership coordination, evidence persistence, customer/deal context, follow-up obligations, secure-document status, and manager-readiness summaries.

## Prohibited or unproven

### `NOT_AUTHORIZED`

- merge of PR #68 or any remediation/evidence branch;
- production deployment or activation;
- live customer contact;
- automatic/provider outbound send;
- treating handoff-open as send;
- rep-entered delivery-status claims;
- CRM stage movement under this field mission;
- deal approval;
- financing approval or lender submission;
- credit pull;
- secure-document activation in production;
- provider/inventory activation;
- paid spend.

### `UNKNOWN`

Until separately proven after the broad re-challenge and deployment verification:

- production runtime presence of the R2 sales-desk stack;
- live manager identity/configuration for these routes;
- live CRM database migration state for the full R2 chain;
- live provider integration for external email/SMS/phone delivery verification;
- live customer adoption/usability of the sales desk;
- real-world rep throughput, response time, conversion lift, appointment lift, or close-rate effect.

## Smallest next revenue-system action

**Run one staging-only Synthetic Rep Desk Dry Run after PR #68 receives broad fresh re-challenge PASS.**

Use one synthetic conversation and no real customer/provider send. Walk a rep through:

`queue -> claim -> review consent/preferred channel -> draft -> open preferred app without sending -> record human execution evidence -> reload durable history -> release`

Capture only three operational measurements:

- conversation observed-to-claim latency;
- claim-to-human-execution-record latency;
- whether the rep completes the path without an ownership/consent/evidence-state misunderstanding.

Why this is the smallest useful next action: it tests whether the already-built revenue workflow is actually usable by a sales operator, produces a measurable baseline without paid traffic or customer exposure, and can reveal whether the next bottleneck is UX/training versus release/security—not architecture.

## Mark disposition

`MARK-FIELD-001 = COMPLETE`

Mark's present-day field result is usable: the current R2 line has a coherent human-operated revenue workflow, stronger evidence boundaries than the failed PR #67 candidate, and a clear safe next experiment. It is **not launch authority**.

`VERIFIED_CANDIDATE != PRODUCTION_DEPLOYED`

`HUMAN_RECORDED_EXECUTION != DELIVERY != CUSTOMER_REACHED`

`COMPETENCE != OWNERSHIP != AUTHORITY`
