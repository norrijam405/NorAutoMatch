# NorAutoMatch R2 Five-Lane Destroyer Round 5 — Five Findings

Date: 2026-10-09

Frozen product candidate challenged:
`6699dd76b5a558697f6b605b8edea1811fcb6ed8`

Frozen product tree:
`dcf359594c24637f23a225474f3bfbd3fe6d4aad`

Authoritative workflow run:
`37999584853`

Result:
`FIVE_LANE_FINDINGS_PRESENT`

## D1 — FRC-23 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-23 — PREVIOUS_CUSTOMER_BINDING_SECRET_CAN_MINT_NEW_BINDING_AUTHORITY`

After a governed rotation, the old secret remains in `previous_secret_sha256`.
The binding insertion trust function accepts either current or previous digest, so direct SQL
presenting the previous secret can mint a brand-new `AUTHENTICATED_CUSTOMER` binding.

Witness:
`NEW_FINDING_D1_PREVIOUS_SECRET_CAN_MINT_NEW_CUSTOMER_BINDING`

## D2 — FRC-24 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-24 — PRESEEDED_FRC21_MIGRATION_LEDGER_CAN_SUPPRESS_REDACTED_SOURCE_GUARD`

An attacker can pre-seed the exact migration name and checksum for the additive FRC-21 migration.
Startup then treats that migration as already applied, does not independently verify the FRC-21
function invariant, and leaves the older communication insert-truth function in place.
A REDACTED source can then mint communication execution truth.

Witness:
`NEW_FINDING_D2_PRESEEDED_FRC21_MIGRATION_SUPPRESSES_REDACTED_SOURCE_GUARD`

## D3 — FRC-25 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-25 — DIRECT_SQL_ASSIGNMENT_REWRITE_CAN_MINT_COMMUNICATION_AUTHORITY`

The communication insert guard correctly consults `public.crm_conversation_assignments`, but the
current-assignment row itself is directly mutable. Direct SQL can rewrite the current assignee and
then create communication evidence as the forged owner.

Witness:
`NEW_FINDING_D3_DIRECT_SQL_ASSIGNMENT_REWRITE_MINTS_COMMUNICATION_AUTHORITY`

## D4 — FRC-26 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-26 — PREVIOUS_SITE_CHAT_SECRET_CAN_MINT_NEW_PUBLICATION_AUTHORITY`

After governed secret rotation, the previous site-chat publication secret remains accepted by the
publication trust path. A new attacker-created access row plus a publication proof generated with
the previous secret can activate a brand-new publication after rotation.

Witness:
`NEW_FINDING_D4_PREVIOUS_SITECHAT_SECRET_CAN_MINT_NEW_PUBLICATION_AUTHORITY`

## D5 — FRC-27 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-27 — PRESEEDED_R6_MIGRATION_LEDGER_CAN_SUPPRESS_ROTATION_GUARD`

An exact checksum/name pre-seed for the r6 site-chat rotation migration causes startup to skip the
migration without independently verifying the rotation-aware anchor guard. Startup succeeds under
the unchanged secret while the required r6 invariant is absent.

Witness:
`NEW_FINDING_D5_PRESEEDED_R6_MIGRATION_SUPPRESSES_ROTATION_GUARD`

## Governance

All five findings route to isolated Defender lanes.
No finding is closed.
No merge.
No deployment.
No production authority.
