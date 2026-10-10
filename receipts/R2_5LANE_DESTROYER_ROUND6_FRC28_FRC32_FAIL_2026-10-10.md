# NorAutoMatch R2 Five-Lane Destroyer Round 6 — FRC-28 through FRC-32

Date: 2026-10-10

Frozen product candidate challenged:
`68183fad9b88d312d60f58b624ceb08a81910e05`

Frozen product tree:
`9031ee0400188eb949302b937a6ecaa7a6e12222`

Authoritative Round 6 run:
`38080158525`

Result:
`FIVE_LANE_FINDINGS_PRESENT`

## D1 — FRC-28 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-28 — PRESEEDED_V16_MIGRATION_CAN_SUPPRESS_CURRENT_ONLY_BINDING_ISSUANCE`

An attacker can pre-seed the exact v16 migration name/checksum. Production startup then skips
the current-only customer-binding trust function without independently verifying its semantic invariant.
After governed rotation, the previous secret can again mint a new customer/opportunity binding.

Witness:
`NEW_FINDING_D1_PREVIOUS_SECRET_CAN_MINT_NEW_CUSTOMER_BINDING`

## D2 — FRC-29 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-29 — PRESEEDED_FRC25_MIGRATION_CAN_SUPPRESS_ASSIGNMENT_AUTHORITY_GUARD`

An exact name/checksum pre-seed for the FRC-25 ownership-authenticity migration lets startup
treat the guard as installed while the actual assignment mutation trigger/function are absent.
Direct SQL can then mint current conversation ownership.

Witness:
`NEW_FINDING_D2_PRESEEDED_FRC25_MIGRATION_SUPPRESSES_ASSIGNMENT_AUTHORITY`

## D3 — FRC-30 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-30 — PRESEEDED_R7_MIGRATION_CAN_SUPPRESS_CURRENT_ONLY_SITECHAT_PUBLICATION`

An exact name/checksum pre-seed for r7 lets startup skip the current-only publication trust change.
After rotation, the previous site-chat secret can again mint brand-new publication authority.

Witness:
`FRC26_PREVIOUS_SECRET_STILL_MINTS_NEW_PUBLICATION_AUTHORITY`

## D4 — FRC-31 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-31 — ASSIGNMENT_EVENT_APPEND_ONLY_EVIDENCE_IS_MUTABLE`

The table `crm_conversation_assignment_events` is documented as append-only evidence, but direct SQL
can UPDATE and DELETE preserved assignment evidence.

Witness:
`NEW_FINDING_D4_ASSIGNMENT_EVENT_APPEND_ONLY_EVIDENCE_MUTABLE:update=true:delete=true`

## D5 — FRC-32 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-32 — DIRECT_SQL_CAN_FORGE_ASSIGNMENT_EVENT_EVIDENCE`

Direct SQL can insert a CLAIMED/RELEASED assignment-event row without a governed assignment transaction,
including evidence for a nonexistent conversation.

Witness:
`NEW_FINDING_D5_DIRECT_SQL_CAN_FORGE_ASSIGNMENT_EVENT_EVIDENCE`

## Governance

All five findings route to isolated Defender lanes.
No merge.
No deployment.
No production authority.
