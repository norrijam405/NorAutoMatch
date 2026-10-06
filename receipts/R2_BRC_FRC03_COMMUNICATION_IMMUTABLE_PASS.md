# R2 BRC-FRC-03 communication evidence immutability remediation PASS

Failed candidate: `3e79e151f4851c48955ffbaf8c674958dee58bd7`.
Successor: `b3cc4b6259c2f96c50bfb05817010fad5b0aacd7`.
Tree: `a3eaad17d87a64277d198d5d3b2488f365fee074`.

Finding closed: `NORAUTOMATCH-R2-BRC-FRC-03 — COMMUNICATION_EVIDENCE_LEDGER_IS_NOT_DATABASE_APPEND_ONLY`.

PostgreSQL now rejects UPDATE and DELETE on `crm_conversation_contact_events` through an immutable-row trigger. The integration test proves direct SQL rewrite and erasure both fail while the original committed delivery evidence survives unchanged.

Exact-head workflow `37447438357`: SUCCESS. Production dependency audit, schema application, ledger integration, direct SQL immutability checks, full typecheck, and production build all passed.

State: `REMEDIATION_BUILDER_PASS / BROAD_FRESH_RECHALLENGE_REQUIRED / NO_PRODUCTION_AUTHORITY`.
