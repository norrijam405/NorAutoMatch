# NorAutoMatch R2 FC-01 Remediation — Fresh Re-Challenger Activation

Date: 2026-10-05

You are being activated as a **new separate Fresh Re-Challenger** for the NorAutoMatch R2 FC-01 remediation successor.

## Repository

`norrijam405/NorAutoMatch`

## Remediation PR

`#58 — R2 FC-01 remediation — atomic current-owner gate for same-site replies`

## Challenge only this exact frozen successor

Commit:
`936b9bbd81ac83afc9383cf3b74b806c2ecdcbf3`

Tree:
`4afd8c37afaa90cf67068b4258e011a21c0d914f`

Failed predecessor:
`da014f6ddbf863ae8b5bd05ec3489913191cb122`

Do not substitute a moving branch head.

## Required starting evidence

Read before executing:
- Fresh Challenger FAIL receipt:
  `receipts/NORAUTOMATCH_R2_CUSTOMER_WORKSPACE_COMMUNICATION_BUNDLE_FRESH_CHALLENGER_FAIL_2026-10-05.md`
- Remediation Builder PASS receipt:
  `receipts/NORAUTOMATCH_R2_FC01_STALE_OWNER_REMEDIATION_EXACT_HEAD_PASS_2026-10-05.md`
- PR #58 body/discussion
- IgniAqua Control Plane issue #29

## Role

You are not the Remediation Builder.

Do not remediate defects in this role.

Your job is to independently attempt to falsify the exact successor and specifically determine whether FC-01 is actually closed without creating a new ownership/publication defect.

## Mandatory challenge themes

At minimum challenge:

1. Original FC-01 race:
   stale Rep A passes/attempts publication while ownership transfers to Rep B.
2. Transfer-before-lock:
   Rep B commits ownership before stale Rep A reaches the mutation lock.
3. Transfer-waits-on-publish:
   Rep A holds the ownership row during a valid publication while Rep B attempts transfer; publication must be attributable to the current owner at insert time.
4. Non-owner direct call to `publishSiteChatReply()` must fail closed.
5. UNASSIGNED conversation publication must fail closed.
6. Missing assignment row must fail closed.
7. Cross-workspace/provider/conversation assignment must not authorize publication.
8. Dead-letter/redacted event must still fail closed.
9. Expired site-thread access must still fail closed.
10. Valid current owner must still be able to publish.
11. Transaction rollback must not leave a partial reply after ownership failure.
12. No deadlock or lock leak after failed publication.
13. Route error mapping must not convert an ownership denial into a success or unrelated 5xx if the known ownership error is raised.
14. No regression to same-site access-token isolation or reply read behavior.
15. No new CRM stage, appointment, reservation, financing, lender, SOLD, LOST, Motive, or external-delivery authority.

## Existing Builder verification

Dedicated workflow:
`NorAutoMatch R2 FC-01 Stale Owner Remediation CI`

Run:
`37369218255`

Conclusion:
`SUCCESS`

This is Builder evidence only, not your conclusion.

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

Freeze a new finding with:
- exact candidate commit/tree
- finding ID/title
- reproduction
- observed result
- expected invariant
- affected files/surfaces
- explicit statement that no remediation occurred

or

### PASS

Freeze a Fresh Re-Challenger PASS receipt with:
- exact candidate commit/tree
- challenge environment
- challenges executed
- result evidence
- known limitations
- explicit statement that PASS does not authorize production
- next role: **Independent Assurance**

Do not ask Norris to reconstruct history already preserved in GitHub.
