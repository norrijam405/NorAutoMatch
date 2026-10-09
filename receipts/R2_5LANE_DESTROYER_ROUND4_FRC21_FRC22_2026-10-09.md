# NorAutoMatch R2 Five-Lane Destroyer Round 4 — FRC-21 / FRC-22

Date: 2026-10-09

Frozen integrated product candidate:
`11b0ca7d363767294f20a4f0a6a3852318b42ddb`

Frozen product tree:
`ff3dd6363e64d4f1525d6c0d53254dfd9c7b3dc8`

Authoritative Round 4 run:
`37998253082`

Aggregate:
`FIVE_LANE_FINDINGS_PRESENT`

## D1 — PASS

FRC-17 Video Hub publication truth remains fail-closed for malformed, arbitrary, or self-asserted PUBLISHED evidence.

## D2 — PASS

A recorded v14 migration cannot hide a deleted customer-binding authenticity trigger.
Production startup failed closed with:
`MIGRATION_INVARIANT_MISSING:infrastructure/norautomatch-crm-v14-authenticated-customer-opportunity-bindings.sql`.

## D3 — FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-21 — REDACTED_CONVERSATION_SOURCE_CAN_MINT_COMMUNICATION_EXECUTION_TRUTH`

Witness:
`NEW_FINDING_D3_REDACTED_SOURCE_MINTS_COMMUNICATION_EXECUTION_TRUTH`

The communication insert-truth guard rejects DEAD_LETTER sources but does not reject REDACTED sources.
A previously valid source event can be transitioned to REDACTED and still authorize a new
`OUTBOUND_EXECUTION_RECORDED` communication evidence row.

Security/evidence effect:
Redaction is not a terminal authority boundary for new communication execution evidence.

## D4 — PASS

FRC-20 temporary and persistent attacker-schema relation shadows remain blocked.

## D5 — FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-22 — GOVERNED_ROOT_SECRET_ROTATION_BREAKS_CUSTOMER_BINDING_ISSUANCE`

Witness:
`NEW_FINDING_D5_GOVERNED_SECRET_ROTATION_BREAKS_BINDING_ISSUANCE`

The v14 customer-binding trust anchor is immutable and permanently bound to the original root-secret digest.
Production restart under a new current secret can succeed while legitimate customer/opportunity binding
issuance under that new governed secret fails closed.

Effect:
Key lifecycle / availability defect. This is not an authorization bypass.

## Routing

Only FRC-21 and FRC-22 route to Defender remediation.
D1, D2, and D4 remain green for this frozen candidate and challenge set.

No merge.
No deployment.
No production authority.
