# NorAutoMatch R2 Five-Lane Destroyer Round 4

Date: 2026-10-09

Frozen integrated product candidate:
`11b0ca7d363767294f20a4f0a6a3852318b42ddb`

Frozen product tree:
`ff3dd6363e64d4f1525d6c0d53254dfd9c7b3dc8`

Authoritative run:
`37998253082`

Result:
`FIVE_LANE_FINDINGS_PRESENT`

## D1 — PASS

FRC-17 PUBLISHED Video Hub truth remained fail-closed against:
- numeric evidence values;
- boolean evidence values;
- object/array evidence values;
- self-asserted string evidence.

## D2 — PASS

After v14 was recorded, the required binding-authenticity trigger was removed.
Production restart detected the missing invariant and failed closed with:
`MIGRATION_INVARIANT_MISSING:infrastructure/norautomatch-crm-v14-authenticated-customer-opportunity-bindings.sql`

## D3 — FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-21 — REDACTED_SOURCE_CAN_MINT_COMMUNICATION_EXECUTION_TRUTH`

The hardened communication insert-truth function rejects `DEAD_LETTER` but does not reject
`REDACTED`. A real source event was moved to REDACTED and a new direct-SQL
`OUTBOUND_EXECUTION_RECORDED` row was accepted using the still-current assignment.

Witness:
`NEW_FINDING_D3_REDACTED_SOURCE_MINTS_COMMUNICATION_EXECUTION_TRUTH`

## D4 — PASS

FRC-20 temporary and persistent relation-shadow attacks remained blocked.

## D5 — FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-22 — GOVERNED_SECRET_ROTATION_BREAKS_CUSTOMER_BINDING_ISSUANCE`

Production was bootstrapped under the original governed root secret, then restarted with a new
current secret and the prior secret correctly supplied as the governed previous secret.
Startup succeeded, but the immutable FRC-16 customer-binding anchor remained bound only to the
original digest. Legitimate binding issuance using the new current secret was rejected.

Witness:
`NEW_FINDING_D5_GOVERNED_SECRET_ROTATION_BREAKS_BINDING_ISSUANCE`

Classification:
availability / key-lifecycle integrity; not an authorization bypass.

## Governance

Only FRC-21 and FRC-22 route to Defender remediation.
No merge.
No deployment.
No production authority.
