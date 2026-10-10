# NorAutoMatch R2 FRC-39/FRC-40 Fresh Re-Challenge — FRC-43 Finding

Frozen Builder successor challenged:
`70457f1da0c566cd0ca7049c7380324e029816e6`

Frozen tree:
`73263eeed20c60bc253bae8389ee4d80acfd7e3c`

Fresh Re-Challenge run:
`38090571645`

Historical sequential duplicate CLAIMED and wrong-actor duplicate RELEASED protections passed in Builder CI.

Fresh finding:
`NORAUTOMATCH-R2-BRC-FRC-43 — CONCURRENT_FIRST_CLAIM_EVIDENCE_RACE_CAN_CREATE_DUPLICATE_CLAIMED_ROWS`

Transaction A inserted the first CLAIMED evidence without committing. Transaction B then inserted the same first CLAIMED evidence because the sequencing guard could not see A's uncommitted row. Both inserts could commit.

Witness:
`NEW_FINDING_CONCURRENT_DUPLICATE_CLAIMED_EVIDENCE_ACCEPTED`

Result:
`FAIL_NEW_FINDING_FRC43`

No merge. No deployment. No production authority.
