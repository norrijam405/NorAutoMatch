# NorAutoMatch R2 FRC-42 Fresh Re-Challenge — FRC-44 Finding

Frozen Builder successor challenged:
`dfe5d3455aff7fbce3262f9904d08615925edebf`

Frozen tree:
`d1f598d446233c3b9a15f2e99b7b4fb5ac90e7d5`

Builder run:
`38090743471`

Fresh Re-Challenge run:
`38090937830`

Fresh finding:
`NORAUTOMATCH-R2-BRC-FRC-44 — FIXED_BEHAVIORAL_PROBE_CAN_BE_SPECIAL_CASED_BY_PERMISSIVE_TRIGGER`

The replacement trigger function preserved all structural marker strings and rejected only the verifier's exact synthetic probe tuple. Production restart accepted the function, after which a different orphan assignment-event insert succeeded.

Witness:
`NEW_FINDING_FRC42_PROBE_SPECIFIC_SPOOF_BYPASSES_BEHAVIORAL_INVARIANT`

Result:
`FAIL_NEW_FINDING_FRC44`

No merge. No deployment. No production authority.
