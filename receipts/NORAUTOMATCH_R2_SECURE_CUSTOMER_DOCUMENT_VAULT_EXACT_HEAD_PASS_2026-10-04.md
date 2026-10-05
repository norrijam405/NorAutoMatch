# NorAutoMatch R2 Secure Customer Document Vault — Exact-Head Software & Storage PASS — 2026-10-04

## Frozen candidate

PR #40 — R2 customer workspace foundation — Torque bridge, secure docs, video hub

- branch: `feature/2026-10-04-customer-workspace-foundation-r0`
- exact head: `d7cae2fc1f3790ccd01087c896591b78b8b10463`
- exact tree: `f9b430364a880868ae306635dbe043624c254eaa`
- base: canonical main `71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`
- state: DRAFT
- mergeability: TRUE
- production deployment: NOT PERFORMED

## Exact-head software verification

Dedicated workflow:
- `NorAutoMatch Customer Workspace Foundation CI`
- run: `37261552458`
- conclusion: **SUCCESS**

The exact-head run passed:
- production dependency security gate
- secure-document metadata boundary
- secure-document file-signature boundary
- Orr conversation normalization boundary
- video publication truth boundary
- deal-readiness boundary
- application TypeScript
- production build

This receipt does not treat unrelated legacy workflow dependency-gate failures as successful.

## Secure customer-document software boundary

Implemented:
- authenticated customer document workspace
- private document upload route
- PDF/JPG/PNG/WebP only
- 12 MiB maximum
- declared MIME must match file signature
- SHA-256 metadata receipt
- cross-origin upload rejection
- early multipart request-size ceiling
- per-user active-document ceiling
- fail-closed activation gate
- fail-closed retention configuration
- Torque/agent status excludes raw bytes, storage path, and filename
- manager-only secure document desk
- 60-second signed view links
- audited manager view-link creation
- CRM opportunity verification before ACCEPTED desk-prep state
- configurable retention deadline
- retention-due raw-file deletion path
- raw deletion evidence
- customer-visible retention state
- recent manager access evidence display

No SSN, bank credential, lender-submission, financing-approval, or deal-approval authority is introduced.

## Dedicated NorAutoMatch Supabase preparation

Project:
- ref: `peyrnfeytjgsuxqxloxt`
- region: `us-east-2`
- PostgreSQL 17

Prepared:
- private bucket `customer-secure-documents`
- 12 MiB bucket ceiling
- allowed MIME: PDF/JPG/PNG/WebP
- RLS-enabled metadata table
- append-only access-event table
- retention metadata and truth constraints
- due-delete storage policy
- bounded authenticated registration/finalization/abandon RPCs

Verified state at preparation:
- customer document rows: 0
- access events: 0
- storage objects: 0
- no fabricated customer document data
- no anon table access
- old registration RPC authenticated execution revoked
- v2 registration is the current bounded retention-aware path

## Known security posture

Supabase advisor reports the authenticated SECURITY DEFINER RPCs as WARN because they are callable by signed-in users. This is an intentional reviewed boundary for the current candidate, not silently treated as clean:
- register v2
- finalize
- abandon pending upload

Each RPC is auth.uid-bound and validates ownership/state. Anon execution is denied.

The pre-existing project warning for leaked-password protection remains unrelated open debt.

## Runtime activation gate

Public secure-document upload remains **disabled** unless both are explicitly configured:

- `NORAUTO_SECURE_DOCUMENTS_ACTIVATION=ACTIVE`
- `NORAUTO_SECURE_DOCUMENT_RETENTION_DAYS=<approved integer>`

No retention duration has been invented or selected by the software operator.

## Remaining gates

Before customer activation:
1. separate Fresh Challenger / Independent Assurance against this exact frozen head/tree
2. founder/dealership choice of retention-days policy
3. controlled authenticated upload → manager review → due-delete proof
4. explicit runtime activation
5. fresh outside-in customer/manager proof

## Disposition

**EXACT_HEAD_SOFTWARE_AND_EMPTY_STORAGE_PASS / PUBLIC_ACTIVATION_NOT_AUTHORIZED**

Authority effect: NONE.
