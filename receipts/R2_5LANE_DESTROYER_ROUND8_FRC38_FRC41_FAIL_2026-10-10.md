# NorAutoMatch R2 Five-Lane Destroyer Round 8 — FRC-38 through FRC-41

Date: 2026-10-10

Frozen product candidate challenged:
`ee9b702f7621ef5940cf68e18fc80f097331c0c2`

Frozen product tree:
`f3bc1a092f7445fef2e6c8664b1fec247b4ae03c`

Authoritative Round 8 run:
`38090209018`

## D1 — FRC-38 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-38 — PRESEEDED_R4_MIGRATION_CAN_SUPPRESS_ASSIGNMENT_EVENT_STATE_BINDING`

An exact r4 migration receipt can be pre-seeded. Startup accepts it without a dedicated r4 semantic invariant, allowing orphan assignment-event evidence.

Witness:
`NEW_FINDING_D1_PRESEEDED_R4_SUPPRESSES_ASSIGNMENT_EVENT_STATE_BINDING`

## D2 — PASS

Post-migration replacement of the assignment-event authenticity/state-binding function with a permissive implementation is detected on restart by the existing r3 semantic invariant.

Observed:
`MIGRATION_INVARIANT_MISSING:infrastructure/norautomatch-conversation-assignment-events-authenticity-r3.sql`

No new finding.

## D3 — FRC-39 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-39 — DUPLICATE_CLAIMED_EVIDENCE_ACCEPTED_WITHOUT_STATE_TRANSITION`

While current state remains ASSIGNED to the same rep, another CLAIMED evidence row can be appended even though no new claim transition occurred.

Witness:
`NEW_FINDING_D3_DUPLICATE_CLAIMED_EVIDENCE_ACCEPTED_WITHOUT_STATE_TRANSITION`

## D4 — FRC-40 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-40 — WRONG_ACTOR_DUPLICATE_RELEASED_EVIDENCE_ACCEPTED`

After a legitimate release leaves the assignment row UNASSIGNED, another actor can append RELEASED evidence because the guard checks only current unassigned state and not the transition/evidence lineage.

Witness:
`NEW_FINDING_D4_WRONG_ACTOR_DUPLICATE_RELEASED_EVIDENCE_ACCEPTED`

## D5 — FRC-41 FAIL_NEW_FINDING

`NORAUTOMATCH-R2-BRC-FRC-41 — GOVERNED_SECRET_CAN_CREATE_NONEXISTENT_CONVERSATION_ASSIGNMENT_EVIDENCE`

A session with the governed assignment secret can create an assignment row for a conversation with no upstream conversation event and then append matching CLAIMED evidence.

Witness:
`NEW_FINDING_D5_GOVERNED_SECRET_CAN_CREATE_NONEXISTENT_CONVERSATION_ASSIGNMENT_EVIDENCE`

## Routing

- FRC-38: dedicated r4 migration semantic invariant.
- FRC-39/FRC-40: one bounded event-transition sequencing primitive, retaining separate witnesses.
- FRC-41: bind assignment creation to upstream conversation existence.

No merge.
No deployment.
No production authority.
