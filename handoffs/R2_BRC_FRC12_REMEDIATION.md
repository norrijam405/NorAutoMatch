# R2 BRC-FRC-12 remediation activation

Act as a new separate Remediation Builder.

Repository:
`norrijam405/NorAutoMatch`

Failed exact product candidate:
`5bac3306f9f2dccf9b01d667e5832f241ce6fcfb`

Frozen tree:
`9c924f2678ac533b60841da3349f91415131b0f3`

Finding:
`NORAUTOMATCH-R2-BRC-FRC-12 — SITE_CHAT_ACCESS_PREISSUANCE_INSERT_TAKEOVER`

Begin with:
`receipts/R2_BRC_FRC12_SITE_CHAT_PREISSUANCE_TAKEOVER_FAIL.md`

Fresh challenger evidence:
- exact FRC-11 rerun: workflow `37778946554`, fresh job `113537496491`
- FRC-12 witness workflow: `37843544891`
- witness job: `113538656648`
- evidence branch: `evidence/r2-frc11-fresh-rechallenge-20261008`

Before product changes, reproduce/accept the preserved runtime sequence:
1. legitimate conversation event + assignment;
2. attacker pre-seeds `crm_site_chat_access` with attacker-controlled verifier;
3. legitimate registration collides;
4. legitimate reply is published;
5. attacker token reads the thread;
6. intended legitimate token does not.

Remediate only the pre-issuance capability-authenticity defect.

Requirements:
- a direct SQL writer must not be able to mint a usable site-thread capability for an attacker-controlled token;
- attacker pre-seeding must not block legitimate issuance;
- capability verification must be bound to workspace + conversation;
- raw browser token must never be stored;
- FRC-11 post-issuance immutability remains intact;
- legitimate `last_seen_at` updates remain intact;
- legitimate issuance/read/expiry behavior remains intact;
- production bootstrap installs any new versioned migration;
- FRC-11 through FRC-01 regressions remain green;
- dependency security, typecheck, and production build pass.

Do not merge.
Do not deploy.
Do not authorize production.
