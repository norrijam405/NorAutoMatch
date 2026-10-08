# R2 BRC-FRC-12 broad rechallenge

Act as a new separate Broad Release-Candidate Fresh Re-Challenger.

Repository:
`norrijam405/NorAutoMatch`

Challenge only exact candidate:
`44580f8fde04a4d75f32f8e70a927ed96c0d65d4`

Tree:
`ca79980fcbcbfc6d524eaf3e89de21b1336921cc`

Failed predecessor:
`5bac3306f9f2dccf9b01d667e5832f241ce6fcfb`

Read:
- PR #74
- IgniAqua Control Plane issue #29
- prior BRC-FRC-12 FAIL receipt
- `receipts/R2_BRC_FRC12_SITE_CHAT_PREISSUANCE_AUTHENTICITY_PASS.md`

Do not remediate, merge, or deploy.

Re-test BRC-FRC-12 first:
- direct SQL may pre-seed arbitrary candidate access rows, but those rows must carry no read authority;
- attacker pre-seeding must not block legitimate application issuance;
- attacker-controlled token must remain unauthorized;
- legitimate application-issued token must read the thread;
- stored verifier must be bound to workspace + conversation;
- raw browser token must not be stored;
- unauthenticated or forged issuance proof must not grant authority;
- FRC-11 post-issuance immutability must remain intact;
- legitimate last_seen_at updates must still work;
- expiry must remain fail-closed;
- real production bootstrap must install and record the FRC-12 versioned migration and verify the access primary-key shape.

Then re-test BRC-FRC-11 through BRC-FRC-01 and continue the complete remaining broad R2 release-candidate challenge matrix.

Stop at the first material new finding.

PASS does not authorize production.
