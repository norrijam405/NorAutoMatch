# NorAutoMatch Render Postgres Preservation and Supabase Migration Receipt — 2026-10-03

## Source backup

Founder-machine pg_dump:
- file: `norautomatch-render-before-expiry-2026-10-03.sql`
- source database: `norautomatch-postgres`
- Render Postgres ID: `dpg-dah04915efls73fdfsk0-a`
- source version: PostgreSQL 17.11
- pg_dump version: 17.11
- source Render expiry: 2026-10-10

The dump was inspected before migration.

## Source-data finding

The old Render database contained the governed CRM schema plus a very small synthetic production-validation evidence set.

Non-empty business-data tables:
- `crm_opportunities`: 1
- `crm_evidence`: 1
- `crm_follow_up_obligations`: 1
- `crm_manager_handoffs`: 1
- `crm_outbox`: 1

The preserved opportunity is explicitly marked:
`SYNTHETIC_PRODUCTION_VALIDATION — NOT A REAL CUSTOMER OR CONVERSION. Preserve only as deployment evidence.`

No live customer CRM record was identified in the dump.

The dump also contained 11 legacy `norautomatch_schema_migrations` rows. Those migration-tracker rows were not copied into the new Supabase database because the target schema is already governed through Supabase migrations and should not manufacture legacy migration-state truth.

## Target

Dedicated NorAutoMatch Supabase project:
- project ref: `peyrnfeytjgsuxqxloxt`
- region: `us-east-2`

The five synthetic evidence rows were migrated idempotently into the corresponding governed CRM tables.

Post-migration verification:
- `crm_opportunities`: 1
- `crm_evidence`: 1
- `crm_follow_up_obligations`: 1
- `crm_manager_handoffs`: 1
- `crm_outbox`: 1

## Security/runtime state

CRM tables remain server-only with RLS enabled and no anon/authenticated policies.
Mutable CRM function search_path warnings were remediated by pinning functions to `pg_catalog, public`.

Live NorAutoMatch runtime security candidate:
- SHA: `ba23d09fa8475a0008e23e51a677fa0ab9ad9cbd`
- change: Next.js 16.3.3 -> 16.3.8
- live Render deploy: `dep-db0nh95g1s2s73esate0`
- deploy state: LIVE
- validator: typecheck PASS, production build PASS
- npm audit summary after bump: 8 high, 0 critical

## Disposition

The expiring Render database is no longer the only durable location of its preserved NorAutoMatch CRM evidence.

Do not delete the source Render database until networking is re-locked and final closure receipt confirms no remaining dependency.

Authority effect: NONE.
