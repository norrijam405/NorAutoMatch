# NorAutoMatch R2 Five-Lane Destroyer Round 3 — Three Findings

Date: 2026-10-09

Frozen product candidate:
`e7f4c5bfc64ec898e885b9b2cb31b461e5cfd1a7`

Frozen product tree:
`195b81bc6459570e8409cade05ec51c4cc064f7f`

Round 3 workflow run:
`37997503756`

Aggregate:
`FIVE_LANE_FINDINGS_PRESENT`

## D1 — FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-17 — NONSTRING_PUBLICATION_EVIDENCE_CAN_MINT_PUBLISHED_VIDEO_TRUTH`

The Video Hub database truth function converts JSON evidence values to text with `->>`.
A numeric `publicationEvidenceRef` therefore satisfies the nonblank test and allows a durable
`publicationState='PUBLISHED'` claim even though canonical application schemas require the evidence
reference to be a string.

Witness:
`NEW_FINDING_D1_NONSTRING_PUBLICATION_EVIDENCE_MINTS_PUBLISHED_TRUTH`

## D2 — FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-18 — CUSTOMER_BINDING_TRUST_ANCHOR_DOES_NOT_SURVIVE_GOVERNED_SECRET_ROTATION`

The exact candidate bootstraps v14 under one governed secret. A later production restart under a
rotated governed secret succeeds because the migration is already recorded, but legitimate binding
issuance under the new current secret fails against the immutable old digest.

Witness:
`NEW_FINDING_D2_BINDING_SECRET_ROTATION_BREAKS_LEGITIMATE_ISSUANCE`

This is an availability / key-lifecycle defect, not an authorization bypass.

## D3 — FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-19 — TEMP_RELATION_SHADOW_CAN_MINT_COMMUNICATION_EXECUTION_TRUTH`

The communication insert-truth trigger function resolves `crm_conversation_events` and
`crm_conversation_assignments` through caller-controlled search_path. Temporary shadow relations
can therefore supply fake eligible-event, consent, preferred-channel, and ownership rows while a
direct insert targets the real public communication ledger.

Witness:
`NEW_FINDING_D3_TEMP_RELATION_SHADOW_MINTS_COMMUNICATION_EXECUTION_TRUTH`

## D4 — PASS

REDACTED site-chat source events remain ineligible for publication.

## D5 — PASS

UPSERT conflict handling cannot mutate site-chat capability expiry.

## Governance

FRC-17, FRC-18, and FRC-19 route to separate Defender remediation lanes.
D4 and D5 remain green.
No merge.
No deployment.
No production authority.
