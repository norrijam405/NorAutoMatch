# NorAutoMatch R2 Five-Lane Destroyer Round 7 — FRC-33 through FRC-37

Date: 2026-10-10

Frozen product candidate challenged:
`248aefe6d9cf6622ed08bc93ee82b3a2812aff21`

Frozen product tree:
`ddb0838af4fac92772a1c1c74c5095fd115e3245`

Authoritative Round 7 run:
`38088494072`

Result:
`FIVE_LANE_FINDINGS_PRESENT`

## D1 — FRC-33 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-33 — PRESEEDED_R2_MIGRATION_CAN_SUPPRESS_ASSIGNMENT_EVENT_IMMUTABILITY`

Exact r2 migration name/checksum can be pre-seeded. Startup skips the migration without verifying its semantic invariant, and assignment-event UPDATE becomes possible.

Witness:
`NEW_FINDING_D1_PRESEEDED_R2_SUPPRESSES_ASSIGNMENT_EVENT_IMMUTABILITY`

## D2 — FRC-34 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-34 — PRESEEDED_R3_MIGRATION_CAN_SUPPRESS_ASSIGNMENT_EVENT_AUTHENTICITY`

Exact r3 migration name/checksum can be pre-seeded. Startup skips the insert-authenticity migration and raw SQL can forge assignment-event evidence.

Witness:
`NEW_FINDING_D2_PRESEEDED_R3_SUPPRESSES_ASSIGNMENT_EVENT_AUTHENTICITY`

## D3 — FRC-35 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-35 — RECORDED_R2_MIGRATION_DOES_NOT_DETECT_IMMUTABILITY_TRIGGER_TAMPER`

After a legitimate r2 migration, both immutability triggers can be removed. A subsequent production restart accepts the recorded migration and does not detect the missing guards.

Witness:
`NEW_FINDING_D3_RECORDED_R2_DOES_NOT_DETECT_TRIGGER_TAMPER`

## D4 — FRC-36 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-36 — RECORDED_R3_MIGRATION_DOES_NOT_DETECT_AUTHENTICITY_TRIGGER_TAMPER`

After a legitimate r3 migration, the assignment-event insert-authenticity trigger can be removed. Production restart accepts the recorded migration and raw event insertion becomes possible.

Witness:
`NEW_FINDING_D4_RECORDED_R3_DOES_NOT_DETECT_TRIGGER_TAMPER`

## D5 — FRC-37 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-37 — GOVERNED_SECRET_CAN_MINT_ORPHAN_ASSIGNMENT_EVENT_EVIDENCE`

A session presenting the real governed assignment secret can append CLAIMED assignment evidence for a nonexistent conversation with no corresponding current assignment row.

Witness:
`NEW_FINDING_D5_GOVERNED_SECRET_CAN_MINT_ORPHAN_ASSIGNMENT_EVIDENCE`

Effect:
The event is authenticated but not independently bound to actual assignment state.

## Routing

FRC-33/FRC-35 share the r2 semantic-invariant boundary and may use one bounded remediation primitive while preserving separate witnesses.
FRC-34/FRC-36 share the r3 semantic-invariant boundary and may use one bounded remediation primitive while preserving separate witnesses.
FRC-37 requires a separate assignment-event truth-binding remediation.

No merge.
No deployment.
No production authority.
