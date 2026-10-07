# R2 BRC-FRC-10 site-chat reply immutability remediation PASS

Failed candidate: `477595088bbb931a1822dc7b9db0f1743b2a851e`.
Successor: `3d41f642129b0912a6279fbf6b28e52f4c2f0d5e`.
Tree: `0a86b1f2386ef4e2d4232b1acf4389ef2646118f`.

Finding closed: `NORAUTOMATCH-R2-BRC-FRC-10 — SITE_CHAT_REPLY_TRUTH_MUTABLE_BY_DIRECT_SQL_UPDATE`.

Published `crm_site_chat_replies` rows are now database-immutable:
- UPDATE is rejected;
- DELETE is rejected;
- TRUNCATE is rejected;
- legitimate publication still succeeds through the FRC-09 insert-truth and deferred access-at-commit guards.

No governed redaction path existed in the frozen candidate, so this remediation does not leave a broad in-place mutation exception. Any future redaction mechanism must be separately governed and auditable rather than rewriting published truth silently.

Exact-head workflow `37679782707`: SUCCESS.

Verified on the production-bootstrapped database:
- arbitrary rewrite of `source_event_id` is rejected;
- arbitrary rewrite of `published_by` is rejected;
- arbitrary rewrite of `body` is rejected;
- DELETE is rejected;
- TRUNCATE is rejected;
- the original legitimate source event, publisher, and body remain unchanged;
- FRC-09 insert-truth checks remain green;
- deferred active-access-at-commit and prior ownership/expiry/revocation protections remain green;
- communication and secure-document regressions remain green;
- production dependency security, full typecheck, and production build pass.

State: `REMEDIATION_BUILDER_PASS / BROAD_FRESH_RECHALLENGE_REQUIRED / NO_PRODUCTION_AUTHORITY`.
