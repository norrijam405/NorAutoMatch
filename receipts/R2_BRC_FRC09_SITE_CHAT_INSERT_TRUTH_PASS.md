# R2 BRC-FRC-09 site-chat insert-truth remediation PASS

Failed candidate: `e7463084182089c2cbc0b3fe8732f8b38e5d8966`.
Successor: `477595088bbb931a1822dc7b9db0f1743b2a851e`.
Tree: `cf7d02bca46905a84af155d3b5a5967dfee084df`.

Finding closed: `NORAUTOMATCH-R2-BRC-FRC-09 — SITE_CHAT_REPLY_OWNERSHIP_AND_EVENT_TRUTH_CAN_BE_FORGED_BY_DIRECT_SQL_INSERT`.

PostgreSQL now enforces insert-time same-site reply truth:
- source_event_id must resolve to an eligible NORAUTO_SITE_CHAT event for the same workspace/conversation;
- DEAD_LETTER and REDACTED events are rejected;
- the current conversation assignment must be ASSIGNED;
- published_by must equal the current assignee;
- the source event and assignment rows are locked through the inserting transaction;
- the existing deferred access-at-commit guard remains in force.

Exact-head workflow `37572094710`: SUCCESS.

Verified:
- real production bootstrap applies and records the site-chat migration;
- the new insert-truth trigger/function exist after production bootstrap;
- arbitrary/missing source-event direct SQL insert is rejected;
- DEAD_LETTER source-event direct SQL insert is rejected;
- non-owner direct SQL insert is rejected;
- forged direct-SQL replies do not persist;
- legitimate current-owner publication still succeeds;
- same-site ownership/expiry/revocation regressions remain green;
- communication and secure-document regressions remain green;
- production dependency security, full typecheck, and production build pass.

State: `REMEDIATION_BUILDER_PASS / BROAD_FRESH_RECHALLENGE_REQUIRED / NO_PRODUCTION_AUTHORITY`.
