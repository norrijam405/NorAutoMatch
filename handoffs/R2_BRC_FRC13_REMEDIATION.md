# R2 BRC-FRC-13 remediation activation

Act as a new separate Remediation Builder.

Repository:
`norrijam405/NorAutoMatch`

Failed exact product candidate:
`44580f8fde04a4d75f32f8e70a927ed96c0d65d4`

Frozen tree:
`ca79980fcbcbfc6d524eaf3e89de21b1336921cc`

Finding:
`NORAUTOMATCH-R2-BRC-FRC-13 — UNAUTHENTICATED_PREISSUANCE_ROW_ACTIVATES_REPLY_PUBLICATION`

Begin with:
`receipts/R2_BRC_FRC13_UNAUTHENTICATED_ACCESS_PUBLICATION_FAIL.md`

Fresh challenger evidence:
- witness workflow `37845829211`
- witness job `113546335377`
- evidence branch `evidence/r2-frc12-fresh-rechallenge-frc13-20261008`

Reproduce or accept the preserved witness before remediation:
1. legitimate site-chat event + current assigned representative;
2. direct SQL pre-seed an unexpired access row without authentic issuance;
3. publish through `publishSiteChatReply()`;
4. observe the customer-visible reply commits.

Remediate only the publication-activation authenticity gap.

Requirements:
- application publication must require a cryptographically authentic access row;
- deferred database commit guard must independently require a cryptographically authentic access row;
- a null, arbitrary, or forged issuance proof must not activate publication;
- direct SQL reply insertion must not bypass the same requirement;
- authenticated FRC-12 browser reads remain functional;
- FRC-11 immutability remains intact;
- legitimate issuance, last_seen_at, expiry, and current-owner publication remain functional;
- production bootstrap installs any new versioned migration;
- FRC-12 through FRC-01 regressions remain green;
- dependency security, typecheck, and production build pass.

Do not merge.
Do not deploy.
Do not authorize production.
