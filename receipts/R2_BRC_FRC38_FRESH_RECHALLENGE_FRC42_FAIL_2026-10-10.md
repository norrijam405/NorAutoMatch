# NorAutoMatch R2 FRC-38 Fresh Re-Challenge — FRC-42 Finding

Frozen Builder successor challenged:
`bf0d7191eb9288f6d5a4e9ea68ae1b1f747eed84`

Frozen tree:
`360eb6269bf83cacf77f66be6ea4d5fbd29868cd`

Fresh Re-Challenge run:
`38090569682`

Historical FRC-38 exact-r4-preseed protection passed in Builder CI.

Fresh finding:
`NORAUTOMATCH-R2-BRC-FRC-42 — SEMANTIC_MARKER_SPOOF_CAN_BYPASS_R3_R4_MIGRATION_INVARIANTS`

A permissive replacement trigger function containing the verifier's expected marker strings was accepted on production restart. The spoof then accepted orphan assignment-event evidence.

Witness:
`NEW_FINDING_FRC38_SEMANTIC_MARKER_SPOOF_BYPASSES_R3_R4_INVARIANTS`

Result:
`FAIL_NEW_FINDING_FRC42`

No merge. No deployment. No production authority.
