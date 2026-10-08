# R2 BRC-FRC-14 remediation activation

Act as a new separate Remediation Builder.

Repository:
`norrijam405/NorAutoMatch`

Failed exact product candidate:
`354d3f6e4cfd83f9f02df8ce34d1de3fd944d967`

Frozen tree:
`238eddd3a9b8704d3a90689ccb4e118f1a9e7925`

Finding:
`NORAUTOMATCH-R2-BRC-FRC-14 — TRANSACTION_LOCAL_HMAC_SECRET_SELF_ASSERTION`

Begin with:
`receipts/R2_BRC_FRC14_TRANSACTION_LOCAL_SECRET_SELF_ASSERTION_FAIL.md`

Fresh challenger evidence:
- workflow `37859028703`
- job `113590077129`
- evidence branch `evidence/r2-frc13-fresh-rechallenge-frc14-20261008`

Runtime witness:
1. create legitimate event + current owner;
2. direct SQL inserts an access row with attacker-chosen publication proof;
3. attacker sets `norautomatch.site_chat_publication_hmac_secret` to its own secret in the same transaction;
4. direct SQL inserts reply;
5. deferred guard accepts the attacker-selected secret and commit succeeds.

Remediate only the database trust-anchor defect.

Requirements:
- transaction-local HMAC settings must not be self-authenticating;
- the database must independently know whether a supplied current/previous secret is trusted;
- bootstrap of that trust anchor must occur in the same governed migration transaction so attacker pre-binding is not possible;
- the trusted anchor must be immutable after bootstrap;
- direct SQL with attacker-chosen GUC + matching forged proof must fail;
- legitimate application publication with the real server secret must still succeed;
- current/previous secret rotation semantics must remain bounded and explicit;
- FRC-13 through FRC-01 regressions remain green;
- real production bootstrap installs and verifies the new trust-anchor migration;
- dependency security, typecheck, and production build pass.

Do not merge.
Do not deploy.
Do not authorize production.
