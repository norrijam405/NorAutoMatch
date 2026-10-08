# R2 BRC-FRC-15 remediation activation

Act as a new separate Remediation Builder.

Repository:
`norrijam405/NorAutoMatch`

Failed exact product candidate:
`61a57b7ed996dc804d1c60b857c2edca5c7d59f5`

Frozen tree:
`73db8891089b3ddff55a17f336925f0e174b402d`

Finding:
`NORAUTOMATCH-R2-BRC-FRC-15 — TEMPORARY_RELATION_SHADOW_BYPASSES_PUBLICATION_SECRET_TRUST_ANCHOR`

Begin with:
`receipts/R2_BRC_FRC15_TEMP_RELATION_SHADOW_FAIL.md`

Fresh challenger evidence:
- independent FRC-14 rerun: workflow `37859729837`, fresh job `113596817812`
- FRC-15 witness workflow `37861440624`
- witness job `113597872936`
- evidence branch `evidence/r2-frc14-fresh-rechallenge-frc15-20261008`

Runtime witness:
1. direct SQL creates a temporary relation named `crm_site_chat_publication_secret_anchor`;
2. attacker inserts its own secret digest into the temp relation;
3. attacker places `pg_temp` ahead of `public`;
4. attacker sets its chosen transaction-local HMAC secret and supplies a matching publication proof;
5. the deferred publication guard resolves the unqualified anchor name through the temp relation and commits the forged reply.

Remediate only the relation-resolution trust-boundary defect.

Requirements:
- every security-critical relation reference in the publication trust chain must be schema-qualified;
- temp relations must not substitute for the immutable public trust anchor;
- temp relations must not substitute for the authoritative site-chat access relation used by the deferred publication guard;
- the exact FRC-15 shadow witness must fail;
- FRC-14 attacker-chosen GUC self-assertion must remain closed;
- legitimate publication using the governed server secret must still succeed;
- FRC-13 through FRC-01 regressions remain green;
- real production bootstrap installs any new versioned migration;
- dependency security, typecheck, and production build pass.

Do not merge.
Do not deploy.
Do not authorize production.
