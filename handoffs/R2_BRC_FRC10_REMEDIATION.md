# R2 BRC-FRC-10 remediation activation

Act as a new separate Remediation Builder.

Repository: `norrijam405/NorAutoMatch`.

Failed exact candidate: `477595088bbb931a1822dc7b9db0f1743b2a851e`.

Frozen tree: `cf7d02bca46905a84af155d3b5a5967dfee084df`.

Finding:

`NORAUTOMATCH-R2-BRC-FRC-10 — SITE_CHAT_REPLY_TRUTH_MUTABLE_BY_DIRECT_SQL_UPDATE`

Begin with:
`receipts/R2_BRC_FRC10_SITE_CHAT_REPLY_IMMUTABILITY_FAIL.md`

Fresh challenger evidence:
- workflow run `37627628935`
- job `112813398066`
- evidence branch `evidence/r2-site-chat-insert-truth-2026-10-07`

Reproduce the preserved witness before any remediation:
1. create a legitimate NORAUTO_SITE_CHAT source event;
2. establish current ASSIGNED ownership;
3. establish active site-chat access;
4. insert a legitimate reply that passes the FRC-09 insert truth and deferred access-at-commit guards;
5. directly UPDATE the persisted `crm_site_chat_replies` row to change `source_event_id`, `published_by`, and `body`;
6. confirm the mutation currently succeeds.

Remediate only the published-reply mutation-truth defect.

Preserve required redaction semantics if redaction is an intentional operation, but do not permit arbitrary rewriting of provenance, publisher identity, or published content after publication.

At minimum challenge:
- arbitrary direct SQL UPDATE of source_event_id must fail;
- arbitrary direct SQL UPDATE of published_by must fail;
- arbitrary direct SQL UPDATE of body must fail;
- DELETE must not silently erase published reply evidence unless explicitly governed;
- TRUNCATE must not silently erase published reply evidence unless explicitly governed;
- any allowed redaction path must be bounded, auditable, and unable to rewrite source provenance or publisher identity;
- legitimate current-owner publication must still work;
- BRC-FRC-09 through BRC-FRC-01 regressions must remain green;
- real production bootstrap must install any new guard/function/trigger;
- production dependency security, full typecheck, and production build must pass.

Do not remediate unrelated findings.
Do not merge.
Do not deploy.
Do not authorize production.
