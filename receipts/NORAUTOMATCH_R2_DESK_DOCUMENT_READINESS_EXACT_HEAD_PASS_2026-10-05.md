# NorAutoMatch R2 Desk Document Readiness — Exact-Head PASS — 2026-10-05

## Candidate

PR #44 — R2 desk document readiness — connect secure vault status to manager queue

- branch: `feature/2026-10-04-desk-document-readiness-r0`
- base: `feature/2026-10-04-customer-workspace-foundation-r0`
- base exact head: `d7cae2fc1f3790ccd01087c896591b78b8b10463`
- candidate head: `7b5fcb3dbfd446f1933f3c60628c984125e50ba4`
- candidate tree: `497bbde3f099e0ab7a168885dd92afec4dd82d86`
- state: DRAFT
- mergeable against its dependent base: TRUE
- production deployment: NOT PERFORMED

## Purpose

Connect secure customer-document status to the existing NorAutoMatch manager queue and manager console.

This deliberately extends existing CRM/desk-prep/manager queue infrastructure instead of creating a second deal-jacket system.

## New bounded behavior

Adds `NORAUTO_DESK_DOCUMENT_READINESS_V1`.

The manager queue can now expose, per opportunity:
- required document kinds
- MISSING / RECEIVED / REVIEW_REQUIRED / ACCEPTED / REJECTED / EXPIRED state
- overall NOT_CONFIGURED / INCOMPLETE / READY_FOR_MANAGER_REVIEW

The read model explicitly preserves:
- rawDocumentsVisible: false
- lenderSubmission: NOT_PERFORMED
- authorityEffect: NONE

No financing approval or deal approval authority is introduced.

## Policy configuration

Required document kinds are **not hard-coded**.

Environment:
`NORAUTO_DESK_REQUIRED_DOCUMENTS`

Example:
`DRIVER_LICENSE,INSURANCE`

If the environment variable is blank, the manager queue reports `NOT_CONFIGURED` rather than inventing dealership policy.

Unsupported values fail closed.

## Query boundary

Document readiness only reads secure-document metadata that:
- is linked to the requested opportunity
- belongs to the `norautomatch` workspace through the CRM opportunity join
- is not `UPLOAD_PENDING`
- does not have `raw_deleted_at`

No raw file bytes, signed URLs, storage paths, filenames, or document hashes are returned by the readiness reader.

## UI

The existing manager console now displays:
- overall document-readiness state
- one status chip per configured required document
- explicit notice that raw files remain outside Torque
- explicit `Lender submission: NOT PERFORMED`

## Verification

Dedicated workflow:
- `NorAutoMatch Desk Document Readiness CI`
- run: `37270446734`
- conclusion: **SUCCESS**

Passed:
- locked dependency install
- production dependency security gate
- isolated readiness TypeScript compile
- document-readiness truth-boundary challenge
- full application typecheck
- production build

## Dependency

This PR depends on PR #40 secure customer-document foundation and is intentionally based on that exact branch/head.

It must not be merged independently to `main` ahead of PR #40.

## Disposition

**EXACT_HEAD_SOFTWARE_PASS / DEPENDENT_DRAFT / NO_PRODUCTION_ACTIVATION**

Authority effect: NONE.
