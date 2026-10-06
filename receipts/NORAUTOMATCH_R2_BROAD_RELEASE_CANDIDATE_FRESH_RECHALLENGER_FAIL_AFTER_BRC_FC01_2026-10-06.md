# NorAutoMatch R2 Broad Release-Candidate Fresh Re-Challenger After BRC-FC-01 Remediation — FAIL

Date: 2026-10-06

Repository: `norrijam405/NorAutoMatch`

Role: **Broad Release-Candidate Fresh Re-Challenger**

## Exact frozen candidate

- commit: `3d6c0cb3c5b17b913bf631f1536ce6bc3f7aa822`
- tree: `66ccf9ab618aa5b216d5ad037b24f0ea3059ce53`
- failed predecessor: `1c37dc6c389ac8531f1d3cbd78a3d28a4f8e4448`
- canonical production base: `71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`
- direct comparison to canonical base: 159 commits ahead / 0 behind
- merge base: exact canonical production base

No moving branch head was substituted for the challenged software candidate.

## BRC-FC-01 re-challenge

The publication-truth remediation was inspected first as required.

Observed on the exact successor:
- manager-entered YouTube/TikTok/Instagram/Facebook URLs are persisted as `UNVERIFIED`
- application schemas reject `PUBLISHED` without a non-empty `publicationEvidenceRef`
- the PostgreSQL Video Hub constraint rejects `PUBLISHED` without a non-empty evidence reference
- `publicVideoLinks()` returns only `PUBLISHED` links from `PUBLIC` entries
- no automatic social-provider publishing authority was added

The original BRC-FC-01 failure was not reproduced in the corrected manager-entry path.

## Disposition

**FAIL**

The broad challenge stopped at the first new material counterexample after the required BRC-FC-01 re-test.

## Finding

**NORAUTOMATCH-R2-BRC-FRC-01 — CROSS_CUSTOMER_SECURE_DOCUMENT_CAN_BE_LINKED_TO_UNRELATED_OPPORTUNITY**

### Affected surfaces

- customer/workspace isolation
- manager/operator authorization boundaries
- secure-document review
- Deal Prep / desk document readiness
- evidence provenance and customer identity integrity

Mandatory broad-challenge themes affected include:
- #1 cross-customer leakage / identity drift
- #4 manager/operator authorization boundaries
- #24 manager desk/document readiness remains evidence/status only
- #29 cross-user document access/isolation fails closed

### Expected invariant

A secure document owned by Customer A must not be attachable to an opportunity for Customer B merely because both records exist inside the NorAutoMatch workspace.

Any document-to-opportunity linkage that drives desk readiness must preserve customer identity/provenance, not only workspace membership and opportunity existence.

### Exact-candidate evidence

In `src/app/manager/documents/actions.ts`, `reviewSecureDocument()`:

1. accepts an arbitrary secure-document UUID and an arbitrary syntactically valid NorAutoMatch opportunity ID;
2. verifies only:
   `select 1 from crm_opportunities where workspace_id = $1 and opportunity_id = $2 limit 1`;
3. loads the secure document by document ID;
4. never compares the document's `user_id` to customer identity/provenance on the selected CRM opportunity;
5. updates that document with the supplied `opportunity_id`.

The exact action therefore proves only that the opportunity exists in workspace `norautomatch`, not that it belongs to the customer who owns the secure document.

In `src/lib/crm-document-readiness.ts`, `readDeskDocumentReadiness()` then consumes secure documents by `opportunity_id`:

`JOIN crm_opportunities o ON o.opportunity_id = d.opportunity_id AND o.workspace_id = $1`

There is no document-owner/customer identity predicate. Once the wrong linkage is created, the unrelated document can count toward the other opportunity's required-document readiness.

### Reproduction

Given:
- secure document `D_A` owned by Customer A;
- valid NorAutoMatch opportunity `O_B` belonging to a different customer B;
- an authenticated `operator`, `admin`, or `founder`.

1. Submit manager secure-document review for `D_A`.
2. Supply `O_B` as `opportunityId`.
3. `reviewSecureDocument()` verifies only that `O_B` exists in workspace `norautomatch`.
4. The action updates `D_A.opportunity_id = O_B`.
5. `readDeskDocumentReadiness()` later joins by `opportunity_id` and can count `D_A` in `O_B`'s readiness state.

No cross-customer identity comparison prevents this linkage.

### Why this is material

This is an evidence-provenance boundary failure. A document from one authenticated customer can become evidence for another customer's deal-prep opportunity through an authorized manager surface.

The defect can contaminate desk-readiness truth and cross-customer provenance even though raw-file RLS remains private. The issue is not merely display labeling: the canonical linkage field used by readiness is rewritten.

### Attribution to the exact candidate

The affected files are included in the challenged R2 delta from canonical production main:

- `src/app/manager/documents/actions.ts`
- `src/lib/crm-document-readiness.ts`
- secure-document schema/readiness surfaces in the same integrated R2 candidate

The candidate is 159 commits ahead / 0 behind canonical production base, with the exact base as merge base. The finding is therefore attributable to the challenged integrated R2 successor.

## Safety / authority

- no remediation performed
- no merge
- no deployment
- no live customer traffic
- no secure-document activation
- no inventory activation
- no Motive/RideMotive/LangGraph execution
- no social-provider execution
- no outbound customer communication
- no paid infrastructure
- no secret disclosure

Authority effect: **NONE**

## Final state

**BROAD_RELEASE_CANDIDATE_FRESH_RECHALLENGER_FAIL / REMEDIATION_REQUIRED / NO_PRODUCTION_AUTHORITY**

Per the activation, broad challenge execution stops at this first new material finding.

A separate Remediation Builder must close the cross-customer document-to-opportunity identity boundary before another broad Fresh Re-Challenger continues the integrated R2 gate.
