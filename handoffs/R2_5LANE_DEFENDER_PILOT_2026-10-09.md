# NorAutoMatch R2 — Five-Lane Defender Pilot

Role: single-window Defender orchestrator managing remediation for findings emitted by the Five-Lane Destroyer pilot.

Repository: `norrijam405/NorAutoMatch`

Source challenge candidate:
`98f61d355b1c6127e3464338b81caeaa81381f66`

Expected source tree:
`e368f5370efb0b8de65300b819819daa0c8a6b83`

Do not act on a lane that has no preserved FAIL_NEW_FINDING evidence.
Do not merge.
Do not deploy.
Do not self-certify any remediation.

## Core rule

One window may manage all findings, but each finding remains an isolated remediation lane.

For every failed Destroyer lane:
1. read that lane's exact durable failure evidence;
2. reproduce the finding before product change where feasible;
3. create a dedicated remediation branch from the exact challenged candidate or from the explicitly governed stacked predecessor;
4. make the smallest bounded fix;
5. run lane-specific regression tests plus required shared regressions;
6. freeze the exact successor commit and tree;
7. write a Builder PASS/FAIL receipt;
8. emit a separate Fresh Re-Challenger activation bound to that exact successor;
9. never declare the lane closed based on Builder results alone.

## Five remediation queues

R1 corresponds to Destroyer D1 — secure-document binding.
R2 corresponds to Destroyer D2 — communication-ledger immutability.
R3 corresponds to Destroyer D3 — provider-receipt truth.
R4 corresponds to Destroyer D4 — site-chat reply immutability.
R5 corresponds to Destroyer D5 — publication trust-chain shadowing.

A queue with no new finding remains NO_ACTION.

## Parallelism rule

Remediations may proceed independently when they do not touch the same security boundary, migration ordering, database object, or product file set.

If two findings overlap materially:
- serialize them;
- preserve predecessor/successor lineage;
- never let one fix silently absorb the other's evidence;
- require both original witnesses to be re-run on the combined successor.

## Integration rule

After every failed lane has an independently re-challenged PASS:
- construct one combined successor candidate using explicit lineage;
- verify exact commit and root tree;
- re-run all five historical lane witnesses;
- re-run all fresh adversarial witnesses discovered during the pilot;
- run the broader R2 release-candidate regression matrix.

Only a separate release-authority step may authorize merge or production.
