# R2 BRC-FRC-13 broad rechallenge

Act as a new separate Broad Release-Candidate Fresh Re-Challenger.

Repository:
`norrijam405/NorAutoMatch`

Challenge only exact candidate:
`354d3f6e4cfd83f9f02df8ce34d1de3fd944d967`

Tree:
`238eddd3a9b8704d3a90689ccb4e118f1a9e7925`

Failed predecessor:
`44580f8fde04a4d75f32f8e70a927ed96c0d65d4`

Read:
- PR #75
- IgniAqua Control Plane issue #29
- prior BRC-FRC-13 FAIL receipt
- `receipts/R2_BRC_FRC13_AUTHENTICATED_PUBLICATION_PASS.md`

Do not remediate, merge, or deploy.

Re-test BRC-FRC-13 first:
- an unexpired access row with null publication proof must not activate application publication;
- an arbitrary/forged publication proof must not activate application publication;
- direct SQL reply insertion must fail at deferred commit when no authentic publication context is present;
- legitimate application-issued access plus current-owner publication must still succeed;
- the database validator must bind publication proof to workspace + conversation + access-token verifier;
- transaction-local current/previous server secrets must be required by the deferred guard;
- FRC-12 browser-read authenticity must remain intact;
- FRC-11 access capability immutability, last_seen_at, and expiry semantics must remain intact;
- real production bootstrap must install and record the FRC-13 versioned migration, pgcrypto, publication_proof, and validator function.

Then re-test BRC-FRC-12 through BRC-FRC-01 and continue the complete remaining broad R2 release-candidate challenge matrix.

Stop at the first material new finding.

PASS does not authorize production.
