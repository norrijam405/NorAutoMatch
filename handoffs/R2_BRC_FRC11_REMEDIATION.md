# R2 BRC-FRC-11 remediation activation

Act as a new separate Remediation Builder.

Repository: `norrijam405/NorAutoMatch`.

Failed exact product candidate:
`3d41f642129b0912a6279fbf6b28e52f4c2f0d5e`

Frozen tree:
`0a86b1f2386ef4e2d4232b1acf4389ef2646118f`

Finding:

`NORAUTOMATCH-R2-BRC-FRC-11 — SITE_CHAT_ACCESS_CAPABILITY_REWRITABLE_BY_DIRECT_SQL_UPDATE`

Begin with:
`receipts/R2_BRC_FRC11_SITE_CHAT_ACCESS_CAPABILITY_REWRITE_FAIL.md`

Fresh challenger evidence:
- exact governed rerun: workflow `37679782707`, fresh job `113189856396`
- witness workflow: `37740887420`
- witness job: `113191076970`
- evidence branch: `evidence/r2-frc10-fresh-rechallenge-20261008`

Reproduce the preserved witness before remediation:
1. establish legitimate site-thread access and published replies;
2. directly rewrite `crm_site_chat_access.access_token_hash` to an attacker-chosen token hash;
3. prove the attacker token can read the existing published thread through `readSiteChatReplies()`;
4. prove the original token is displaced.

Remediate only the access-capability truth/mutation defect.

Preserve the legitimate `last_seen_at` update used by thread reads. Do not accidentally make the access row fully immutable if that breaks the governed read path.

At minimum challenge:
- direct SQL must not rewrite `access_token_hash`;
- direct SQL must not extend or otherwise rewrite `expires_at` outside a governed issuance/renewal path;
- arbitrary reassignment of workspace/conversation identity must fail;
- legitimate `last_seen_at` activity updates must still work;
- legitimate initial access issuance must still work;
- intentional revocation semantics, if any, must remain fail-closed;
- FRC-10 through FRC-01 regressions must remain green;
- real production bootstrap must install any new guard/function/trigger;
- dependency security, full typecheck, and production build must pass.

Do not remediate unrelated findings.
Do not merge.
Do not deploy.
Do not authorize production.
