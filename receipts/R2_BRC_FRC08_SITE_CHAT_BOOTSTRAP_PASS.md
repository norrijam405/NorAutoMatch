# R2 BRC-FRC-08 site-chat production bootstrap remediation PASS

Failed candidate: `41d3042b41e685b1f384a78a1840bdba77bc762e`.
Successor: `e7463084182089c2cbc0b3fe8732f8b38e5d8966`.
Tree: `feff684ae62017b6fa5843e9af9c295a3c2ea679`.

Finding closed: `NORAUTOMATCH-R2-BRC-FRC-08 — PRODUCTION_STARTUP_OMITS_SITE_CHAT_THREAD_SCHEMA_AND_COMMIT_GUARD`.

Production startup now includes `infrastructure/norautomatch-site-chat-thread-r0.sql` after ownership and communication-ledger migrations.

Exact-head workflow `37548982937`: SUCCESS.

Verified through the real production launcher:
- site-chat schema is installed by `npm start` migration-only
- `crm_site_chat_access` exists
- `crm_site_chat_replies` exists
- deferred trigger `crm_site_chat_reply_access_commit_guard` exists
- function `norauto_enforce_site_chat_reply_access_at_commit` exists
- second startup run remains checksum-clean/idempotent
- secure-document binding regression still passes
- communication truth regression still passes
- same-site ownership/expiry race regression passes on the production-bootstrapped schema
- production dependency security, full typecheck, and production build pass

State: `REMEDIATION_BUILDER_PASS / BROAD_FRESH_RECHALLENGE_REQUIRED / NO_PRODUCTION_AUTHORITY`.
