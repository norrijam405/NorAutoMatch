# R2 Broad Release-Candidate Fresh Re-Challenger FAIL after BRC-FRC-07

Date: 2026-10-06

## Bound candidate

Repository: `norrijam405/NorAutoMatch`

Exact frozen successor:
`41d3042b41e685b1f384a78a1840bdba77bc762e`

Tree:
`2f49e41749f789a1d00f0f636cd330415f55e12b`

Failed predecessor:
`ae1789d81cf0cffcec2f31ed6be9a20f0489b3e8`

Role: separate Broad Release-Candidate Fresh Re-Challenger.

No remediation, merge, deploy, production activation, live traffic, provider execution, or outbound customer communication was performed.

## Required BRC-FRC-07 first check

The exact candidate source now places these migrations after CRM v1-v13 in the real `npm start` production migration launcher:

- `infrastructure/norautomatch-conversation-ownership-r0.sql`
- `infrastructure/norautomatch-conversation-communication-ledger-r0.sql`

The communication-ledger schema contains:

- `crm_conversation_assignments`
- `crm_conversation_contact_events`
- `crm_conversation_contact_events_insert_truth`
- `crm_conversation_contact_events_immutable`
- `crm_conversation_contact_events_no_truncate`

The preserved exact-head production-bootstrap run `37536403303` is SUCCESS and records use of the real production migration-only launcher, second-start checksum/idempotency verification, production schema verification, FRC-06 fail-closed provider-receipt regression, production dependency security, typecheck, and production build.

Fresh Challenger environment limitation: Node.js 22.16.0 is available locally, but no PostgreSQL server/client is available and outbound GitHub network resolution is blocked. Therefore this role did not claim a second independent PostgreSQL execution; exact-source verification and the preserved exact-head PostgreSQL 17 run were used as corroborating evidence.

## Prior repaired lineage re-check before new finding

The exact frozen source preserves the BRC-FRC-06 through BRC-FRC-01 repairs on the challenged surfaces:

- delivery truth fails closed without a separately governed verified-provider path;
- arbitrary rep-entered receipt text cannot mint delivery through the application path;
- direct-SQL delivery insertion is rejected by the insert-truth trigger;
- UPDATE, DELETE, and TRUNCATE protections exist on the communication ledger;
- production startup includes CRM v13 customer/opportunity binding;
- secure-document readiness joins document user identity to the opportunity customer binding;
- manager-entered social publication truth requires publication evidence for `PUBLISHED`.

No regression in those already-repaired invariants was found before the first new material finding below.

## First new material finding

**NORAUTOMATCH-R2-BRC-FRC-08 — PRODUCTION_STARTUP_OMITS_SITE_CHAT_THREAD_SCHEMA_AND_COMMIT_GUARD**

### Expected invariant

The real production startup path must install every database schema required by enabled R2 runtime paths. In particular, Ask Torque same-site thread registration/read and manager same-site reply publication require:

- `crm_site_chat_access`
- `crm_site_chat_replies`
- deferred constraint trigger `crm_site_chat_reply_access_commit_guard`
- function `norauto_enforce_site_chat_reply_access_at_commit()`

The deferred guard is part of the previously assured FC-01 → FRC-03 race closure and is required to prevent a reply from committing after site-thread access expires or is revoked.

### Reproduction / exact-source evidence

1. `scripts/start-production.mjs` on exact candidate `41d3042...` hard-codes the production migration list as CRM v1-v13 plus:
   - `norautomatch-conversation-ownership-r0.sql`
   - `norautomatch-conversation-communication-ledger-r0.sql`

2. It does **not** include:
   - `infrastructure/norautomatch-site-chat-thread-r0.sql`

3. A cross-check of every migration currently in the production launcher found zero definitions of:
   - `crm_site_chat_access`
   - `crm_site_chat_replies`
   - `norauto_enforce_site_chat_reply_access_at_commit`

4. The dedicated feature workflow `.github/workflows/norautomatch-site-chat-thread-ci.yml` manually installs `infrastructure/norautomatch-site-chat-thread-r0.sql` with `psql` before running its integration test. Therefore that green feature test does not prove the normal production launcher installs the same-site thread schema.

5. Runtime code requires the omitted schema:
   - `src/app/api/ask-torque/route.ts` persists the conversation event and then calls `registerSiteChatAccess(...)`, which reads/inserts `crm_site_chat_access`.
   - `src/app/api/ask-torque/thread/route.ts` calls `readSiteChatReplies(...)`, which reads `crm_site_chat_access` and `crm_site_chat_replies`.
   - `src/app/api/manager/conversations/site-reply/route.ts` calls `publishSiteChatReply(...)`, which requires those tables and relies on the deferred commit-time access guard.

6. The BRC-FRC-07 successor delta is only 3 commits ahead / 0 behind its predecessor and changes only:
   - `.github/workflows/norautomatch-r2-brc-frc01-secure-document-binding-ci.yml`
   - `scripts/start-production.mjs`
   - `scripts/verify-production-communication-ledger.mjs`

   The production-startup change added only the ownership and communication-ledger migrations; it did not add the same-site thread migration.

### Material impact

On a fresh production database bootstrapped exclusively through the governed `npm start` migration path:

- Ask Torque can persist a conversation event and then fail when registering site-thread access because `crm_site_chat_access` is absent.
- Same-site thread reads fail because the site-thread tables are absent.
- Manager same-site replies fail because the site-thread tables are absent.
- More importantly, the FC-01/FRC-01/FRC-02/FRC-03 commit-time access/revocation protection is not installed through the production migration launcher.

This creates the same class of evidence gap exposed by BRC-FRC-02 and BRC-FRC-07: a dedicated CI manually installs a feature schema while the real production bootstrap omits it.

### Attribution

The defect is present in the exact frozen release candidate under challenge. The candidate explicitly modifies the production migration launcher to close BRC-FRC-07 but still leaves the R2 same-site thread schema outside that launcher. The broad release candidate therefore remains production-incomplete even though the dedicated site-thread CI and the BRC-FRC-07 exact-head workflow are green.

## Disposition

**BROAD_RELEASE_CANDIDATE_FRESH_RECHALLENGER_FAIL / REMEDIATION_REQUIRED / NO_PRODUCTION_AUTHORITY**

Stopped at the first material new finding as governed.

Next role should be a separate Remediation Builder bound to exact failed candidate `41d3042b41e685b1f384a78a1840bdba77bc762e` and this BRC-FRC-08 finding. The repair should be independently re-challenged afterward.

No remediation was performed in this role.
