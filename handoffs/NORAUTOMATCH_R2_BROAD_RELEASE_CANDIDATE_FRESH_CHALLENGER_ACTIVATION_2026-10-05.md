# NorAutoMatch R2 Broad Release-Candidate Fresh Challenger Activation

Date: 2026-10-05

You are being activated as the **new separate Broad Release-Candidate Fresh Challenger** for the final NorAutoMatch R2 integrated successor.

## Repository

`norrijam405/NorAutoMatch`

## Challenge only this exact frozen candidate

Commit:
`1c37dc6c389ac8531f1d3cbd78a3d28a4f8e4448`

Tree:
`d5f52430d4b92429d5e936550437e94c0cdc46b1`

Canonical production base:
`71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`

The candidate is 144 commits ahead and 0 behind canonical production main.

Do not substitute a moving branch head.

## Required starting evidence

Read before executing:
- `receipts/NORAUTOMATCH_R2_RELEASE_RECONCILIATION_BROAD_CHALLENGE_REQUIRED_2026-10-05.md`
- `receipts/NORAUTOMATCH_R2_FC01_FRC03_ACCESS_COMMIT_GUARD_INDEPENDENT_ASSURANCE_PASS_2026-10-05.md`
- PR #53, #54, #55, #58, #59, #60, #61 bodies/discussion
- IgniAqua Control Plane issues #27, #28, #29
- the original broad Fresh Challenger activation for PR #55
- exact candidate source/schema/workflow files relevant to the bundle

## Role

You are not a Builder, Remediation Builder, release operator, or production activator.

Do not remediate defects in this role.

Your job is to independently attempt to falsify the **entire final integrated R2 bundle**, not only the FC-01→FRC-03 remediation lineage.

If you find any material defect, freeze a FAIL and stop.

If no material counterexample is found, freeze a Broad Fresh Challenger PASS and state that a final broad Independent Assurance review is next.

## Mandatory broad challenge themes

At minimum challenge:

### Customer/workspace isolation
1. Cross-customer and cross-conversation leakage.
2. Cross-workspace/provider identity drift.
3. Customer session/workspace binding around account routes.
4. Manager/operator authorization boundaries.

### Conversation ownership + same-site replies
5. Original FC-01 stale-owner race remains closed.
6. FRC-01/FRC-02/FRC-03 expiry/revocation protections remain closed.
7. Non-owner, UNASSIGNED, and missing-assignment publication fails closed.
8. Site-thread token replay/hijack/cross-thread reads fail closed.
9. Dead-letter/redacted event publication fails closed.
10. Valid current-owner same-site publication still works.

### Communication ledger truth
11. Opening email/SMS/phone apps cannot become send evidence.
12. Rep execution evidence cannot become delivery evidence.
13. Delivery evidence cannot become customer-reached/contact-confirmed evidence.
14. Phone placement cannot imply answer/contact.
15. Preferred-contact bypass fails.
16. Communication-consent bypass fails.
17. Client-action idempotency collision cannot rewrite evidence identity.
18. Raw contact details are not leaked into durable ledger beyond intended masked/digest fields.

### Ask Torque
19. Ask Torque intake cannot invent delivery, appointment, reservation, approval, financing, lender, SOLD, or LOST state.
20. No raw secure-document bytes/IDs/storage paths enter Ask Torque context.
21. No external Motive/RideMotive/LangGraph execution occurs.
22. Same-site response authority remains bounded to the site thread only.

### Deal Prep / desk documents
23. Deal Prep cannot imply lender submission, credit decision, reservation, or approval.
24. Manager desk/document readiness remains evidence/status only.
25. Missing dealership requirements remain NOT_CONFIGURED rather than invented.

### Secure documents
26. Customer secure-document upload remains disabled unless `NORAUTO_SECURE_DOCUMENTS_ACTIVATION=ACTIVE`.
27. Disabled state fails closed.
28. Raw documents are not exposed to agent/chat surfaces.
29. Cross-user document access fails closed.
30. Manager review/download paths require authorized roles.
31. Retention/deletion state cannot silently delete PRESERVED documents.
32. No lender submission/credit decision authority is introduced.
33. Do not activate secure-document upload in this challenge.

### Video Hub / VIN recommendations
34. DRAFT/UNLISTED video exposure fails closed where required.
35. VIN recommendations cannot cross VIN boundaries.
36. Publication metadata cannot imply social-channel posting that did not occur.
37. No automatic external social publishing authority.

### Inventory
38. Inventory-cache/runtime activation is not silently enabled.
39. Demo/live activation boundaries remain explicit.
40. No unapproved provider scraping/undocumented endpoint execution.

### Regression and authority
41. Exact candidate remains 0 behind canonical production main.
42. Production dependency security gate remains green.
43. Typecheck/build remain exact-head bound.
44. No CRM stage progression is introduced by evidence-only actions.
45. No appointment/reservation/finance/lender/SOLD/LOST authority appears.
46. No paid infrastructure or production deployment is initiated.

## Known process context

The FC-01→FRC-03 defect lineage has already earned:
- Remediation Builder PASS
- Fresh Re-Challenger PASS
- Independent Assurance PASS

Those results are corroborating context only. This role must challenge the complete integrated R2 bundle.

## Current production boundaries

Keep secure documents disabled.
Keep inventory mode demo unless separately governed.
No Motive/RideMotive/LangGraph external execution.
No production merge/deploy.
No live customer traffic.
No secret disclosure.
No paid infrastructure without explicit authorization.

Authority effect: **NONE**.

## Required disposition

### FAIL

Freeze a durable Broad Fresh Challenger FAIL receipt containing:
- exact commit/tree
- finding ID/title
- reproduction/evidence
- expected invariant
- affected surface
- why it is attributable to the exact candidate
- explicit statement that no remediation occurred

### PASS

Freeze a durable Broad Fresh Challenger PASS receipt containing:
- exact commit/tree
- challenge environment
- complete challenge matrix/results
- known limitations
- evidence references
- explicit statement that PASS does not authorize production
- next role: **Broad Independent Assurance / Final Production Activation Decision**

Do not ask Norris to reconstruct history already preserved in GitHub.
