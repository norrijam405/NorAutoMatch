# NorAutoMatch R2 FRC-01 Expiry Remediation — Fresh Re-Challenger Activation

Date: 2026-10-05

You are being activated as a **new separate Fresh Re-Challenger** for the NorAutoMatch R2 FRC-01 expiry-remediation successor.

## Repository

`norrijam405/NorAutoMatch`

## Remediation PR

`#59 — R2 FRC-01 remediation — re-evaluate site-thread expiry after ownership lock`

## Challenge only this exact frozen successor

Commit:
`a3311dac4891efdada833e5fc06d7c42ff7898fd`

Tree:
`95afba81c0e51d0d66feb7f81e78506b0ac1cc8e`

Failed predecessor:
`936b9bbd81ac83afc9383cf3b74b806c2ecdcbf3`

Do not substitute a moving branch head.

## Required starting evidence

Read before executing:
- prior FAIL receipt:
  `receipts/NORAUTOMATCH_R2_FC01_STALE_OWNER_REMEDIATION_FRESH_RECHALLENGER_FAIL_2026-10-05.md`
- remediation PASS receipt:
  `receipts/NORAUTOMATCH_R2_FC01_FRC01_EXPIRY_REMEDIATION_EXACT_HEAD_PASS_2026-10-05.md`
- PR #59 body/discussion
- IgniAqua Control Plane issue #29

## Role

You are not the Remediation Builder.

Do not remediate defects in this role.

Independently attempt to falsify the exact successor. In particular, determine whether FRC-01 is actually closed without weakening the original FC-01 stale-owner protection.

## Mandatory challenge themes

At minimum challenge:

1. Original FC-01 stale-owner transfer race remains closed.
2. Original FRC-01 expiry-while-waiting race remains closed.
3. Access expires immediately before ownership lock acquisition.
4. Access expires immediately after ownership lock acquisition but before insert eligibility is evaluated.
5. Valid owner + valid active access still publishes.
6. Non-owner direct publish fails.
7. UNASSIGNED and missing assignment fail.
8. Expired access fails with no insert.
9. Rollback after ownership/access failure leaves no partial reply.
10. No lock leak or deadlock after failed publication.
11. Cross-workspace/provider/conversation isolation remains intact.
12. Route-level error mapping does not convert ownership/access denial into success.
13. Same-site read/token isolation still works.
14. No CRM stage/appointment/reservation/finance/lender/SOLD/LOST authority appears.
15. No external provider/Motive send is introduced.

## Existing Builder verification

Workflow:
`NorAutoMatch R2 FRC-01 Expiry-After-Lock Remediation CI`

Run:
`37397221338`

Conclusion:
`SUCCESS`

Builder evidence is context only, not your conclusion.

## Boundaries

- no remediation
- no merge
- no production deployment
- no live customer traffic
- no secure-document activation
- no inventory-cache activation
- no Motive/RideMotive execution
- no outbound customer communication
- no secret disclosure

Authority effect: NONE.

## Required disposition

Return either:

### FAIL
Freeze a new finding with exact commit/tree, reproduction, expected invariant, observed result, affected surface, and explicit statement that no remediation was performed.

or

### PASS
Freeze a Fresh Re-Challenger PASS receipt with exact commit/tree, challenge environment, challenges executed, results, limitations, explicit statement that PASS does not authorize production, and next role: Independent Assurance.

Do not ask Norris to reconstruct history already preserved in GitHub.
