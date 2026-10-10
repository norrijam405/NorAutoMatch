# NorAutoMatch R2 Five-Lane Destroyer Round 9 — FRC-45 through FRC-48

Date: 2026-10-10

Frozen product candidate challenged:
`0cb0c9049f7f60b0c84a4f472c48435fb1d2deda`

Frozen product tree:
`ad33af4f9911e0434abfa9457bdf033a5b9b6dfd`

Authoritative Round 9 run:
`38091673972`

## D1 — FRC-45 FAIL_NEW_FINDING
`PRESEEDED_UPSTREAM_EXISTENCE_R2_SUPPRESSES_ASSIGNMENT_TRUTH`

Exact migration preseed suppresses the FRC-41 upstream-existence function replacement, allowing ownership for a nonexistent conversation.

Witness:
`NEW_FINDING_D1_PRESEEDED_UPSTREAM_EXISTENCE_R2_SUPPRESSES_ASSIGNMENT_TRUTH`

## D2 — PASS

Pre-seeding sequencing r5 did not reopen duplicate CLAIMED evidence because later concurrency r6 reinstalled the sequencing logic.

Observed:
`PASS D2 Round9: r6 safely subsumes preseeded r5 sequencing`

## D3 — FRC-46 FAIL_NEW_FINDING
`PRESEEDED_CONCURRENCY_R6_REOPENS_CONCURRENT_DUPLICATE_CLAIMED_RACE`

Exact r6 migration preseed suppresses the advisory-lock remediation while r5 sequencing remains raceable.

Witness:
`NEW_FINDING_D3_PRESEEDED_R6_REOPENS_CONCURRENT_DUPLICATE_CLAIMED_RACE`

## D4 — FRC-47 FAIL_NEW_FINDING
`AUTH_ONLY_DOWNGRADE_REMOVES_UPSTREAM_EXISTENCE_WITHOUT_STARTUP_DETECTION`

Replacing the assignment mutation function with the earlier auth-only implementation passes existing startup checks and permits nonexistent-conversation assignment again.

Witness:
`NEW_FINDING_D4_AUTH_ONLY_DOWNGRADE_REMOVES_UPSTREAM_EXISTENCE_WITHOUT_STARTUP_DETECTION`

## D5 — FRC-48 FAIL_NEW_FINDING
`STATE_ONLY_DOWNGRADE_REMOVES_SEQUENCING_WITHOUT_STARTUP_DETECTION`

The stable security anchor preserves authentication and current-state truth, but a permissive evolving event guard can remove transition sequencing without startup detection, allowing duplicate CLAIMED evidence.

Witness:
`NEW_FINDING_D5_STATE_ONLY_DOWNGRADE_REMOVES_SEQUENCING_WITHOUT_STARTUP_DETECTION`

## Routing

- FRC-45/FRC-47: stable exact-fingerprint assignment upstream-existence anchor.
- FRC-46: stable exact-fingerprint per-conversation concurrency-lock anchor.
- FRC-48: stable exact-fingerprint transition-sequencing anchor.

No merge.
No deployment.
No production authority.
