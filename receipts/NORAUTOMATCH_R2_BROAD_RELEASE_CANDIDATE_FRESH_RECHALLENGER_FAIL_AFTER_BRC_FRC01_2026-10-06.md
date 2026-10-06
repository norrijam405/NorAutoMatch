# NorAutoMatch R2 Broad Release-Candidate Fresh Re-Challenger After BRC-FRC-01 Remediation — FAIL

Date: 2026-10-06

Repository: `norrijam405/NorAutoMatch`

Role: **Broad Release-Candidate Fresh Re-Challenger**

## Exact frozen candidate

- commit: `d337f8b057631a599a30b4c55ea2d2a5afea67a6`
- tree: `5058a0cc0a937ea94e12668224420e8c04e99edf`
- failed predecessor: `3d6c0cb3c5b17b913bf631f1536ce6bc3f7aa822`
- canonical production base: `71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`
- direct comparison to canonical base: 168 commits ahead / 0 behind
- merge base: exact canonical production base

No moving branch head was substituted for the challenged software candidate.

## Required BRC-FRC-01 re-challenge

The cross-customer secure-document/opportunity remediation was inspected first.

On the exact candidate:
- `reviewSecureDocument()` now calls `requireVerifiedCustomerOpportunityBinding()` before linking a document to an opportunity.
- `readDeskDocumentReadiness()` now requires an exact `crm_opportunity_customer_bindings.customer_user_id = customer_secure_documents.user_id` match.
- `infrastructure/norautomatch-crm-v13-customer-opportunity-bindings.sql` defines an immutable customer↔opportunity binding table and a trigger intended to reject direct cross-customer document linkage.
- the dedicated BRC-FRC-01 CI explicitly applies the v13 migration and challenges direct database linkage plus historical readiness contamination.

The original application-level BRC-FRC-01 cross-customer linkage was not reproduced in the corrected source path.

## Disposition

**FAIL**

The broad challenge stopped at the first new material counterexample after the required BRC-FRC-01 re-test.

## Finding

**NORAUTOMATCH-R2-BRC-FRC-02 — PRODUCTION_STARTUP_OMITS_CUSTOMER_OPPORTUNITY_BINDING_MIGRATION**

### Affected surfaces

- production schema/runtime compatibility
- BRC-FRC-01 direct-database bypass protection
- manager secure-document review
- manager queue / desk-document readiness
- release-candidate deployability

Mandatory broad-challenge themes affected include:
- #24 manager desk/document readiness remains evidence/status only
- #29 cross-user document isolation fails closed
- #30 manager review paths remain operable only behind authorized boundaries
- #41 exact-candidate release integrity
- #43 exact-head runtime/build binding
- #46 no unsafe production activation

### Expected invariant

A release candidate that introduces a new runtime-required CRM table/trigger must include that migration in the normal production migration path.

The same schema that earns the dedicated CI PASS must be applied by the production bootstrap before application traffic can depend on it.

### Exact-candidate evidence

The exact candidate adds:

`infrastructure/norautomatch-crm-v13-customer-opportunity-bindings.sql`

That migration creates:
- `crm_opportunity_customer_bindings`
- the immutable binding guard
- `norautomatch_enforce_secure_document_opportunity_binding()`
- the `customer_secure_document_opportunity_binding_guard` trigger

The exact candidate runtime then depends on that schema:

1. `src/lib/customer-opportunity-binding.ts` queries `crm_opportunity_customer_bindings`.
2. `src/app/manager/documents/actions.ts` calls that query before secure-document linkage.
3. `src/lib/crm-document-readiness.ts` joins `crm_opportunity_customer_bindings` for manager desk readiness.

However, the exact candidate production launcher `scripts/start-production.mjs` has a hard-coded migration list that ends at:

`infrastructure/norautomatch-crm-v12-inventory-provider-cache.sql`

It does **not** include:

`infrastructure/norautomatch-crm-v13-customer-opportunity-bindings.sql`

The dedicated BRC-FRC-01 CI does not exercise the real production migration launcher. Instead, `.github/workflows/norautomatch-r2-brc-frc01-secure-document-binding-ci.yml` manually runs:

`psql ... -f infrastructure/norautomatch-crm-v13-customer-opportunity-bindings.sql`

before executing the binding challenge.

### Reproduction / failure mode

Starting the exact candidate against a database that has been advanced only by its own normal production migration path yields a schema no newer than v12.

The application then references `crm_opportunity_customer_bindings`, which that bootstrap never created.

Consequences:
- manager secure-document review that attempts opportunity binding cannot complete because the required relation is absent;
- manager queue desk-document readiness queries reference the absent relation and fail rather than returning a valid read model;
- the database-level BRC-FRC-01 direct-bypass trigger is not installed by the production launcher;
- the dedicated CI PASS is therefore not representative of the candidate's normal production startup path.

This is a release-candidate schema/runtime mismatch, not an optional deployment configuration difference.

### Why this is material

The remediation's core database control is absent from the candidate's standard production migration sequence.

A release could therefore build successfully and pass the dedicated CI while entering production with runtime code that requires schema the launcher did not install. That both breaks manager readiness/review functionality and defeats the claim that the direct-database bypass guard is part of the production-ready remediation.

### Attribution to the exact candidate

The v13 migration, runtime queries, dedicated workflow, and production launcher are all part of exact candidate:

`d337f8b057631a599a30b4c55ea2d2a5afea67a6`

The candidate is 168 commits ahead / 0 behind canonical production base, with canonical main as merge base.

## Safety / authority

- no remediation performed
- no merge
- no deployment
- no live customer traffic
- no secure-document activation
- no inventory activation
- no external provider execution
- no outbound customer communication
- no paid infrastructure
- no secret disclosure

Authority effect: **NONE**

## Final state

**BROAD_RELEASE_CANDIDATE_FRESH_RECHALLENGER_FAIL / REMEDIATION_REQUIRED / NO_PRODUCTION_AUTHORITY**

Per activation, broad challenge execution stops at this first material new finding.

A separate Remediation Builder must add the v13 binding migration to the governed production migration path and prove the normal startup path installs the same schema used by the BRC-FRC-01 challenge before another Broad Fresh Re-Challenger continues the remaining matrix.
