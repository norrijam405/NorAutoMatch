# NorAutoMatch R2 FRC-42 Fresh Re-Challenge — FRC-44 Finding

Date: 2026-10-11

Frozen Builder successor challenged:
`dfe5d3455aff7fbce3262f9904d08615925edebf`

Frozen tree:
`d1f598d446233c3b9a15f2e99b7b4fb5ac90e7d5`

Fresh Re-Challenge run:
`38136250929`

Fresh finding:
`NORAUTOMATCH-R2-BRC-FRC-44 — PROBE_AWARE_SPOOF_CAN_BYPASS_SINGLE_BEHAVIORAL_MIGRATION_INVARIANT`

A permissive replacement assignment-event trigger function was made probe-aware:
- it rejected the exact known startup probe;
- it preserved the semantic marker strings expected by the static checks;
- production startup accepted the migration state;
- a different orphan assignment-event insert was then accepted.

Witness:
`NEW_FINDING_FRC42_PROBE_AWARE_SPOOF_BYPASSES_BEHAVIORAL_INVARIANT`

Result:
`FAIL_NEW_FINDING_FRC44`

No merge.
No deployment.
No production authority.
