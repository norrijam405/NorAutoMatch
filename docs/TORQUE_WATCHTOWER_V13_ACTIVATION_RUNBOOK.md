# Torque Watchtower v13 Database Activation Runbook

Status: PREPARED — NO PRODUCTION AUTHORITY

## Scope

Migration:

`infrastructure/norautomatch-crm-v13-torque-hunts-scout-opportunities.sql`

Creates only:

- `public.torque_vehicle_hunts`
- `public.industry_scout_observations`
- `public.scout_opportunity_matches`
- supporting indexes
- immutable trigger on Industry Scout observations
- RLS/revokes for operator-only tables

It must not alter existing CRM opportunity/evidence rows, customer data, auth users, or Garage/MatchDNA records.

## Required preflight

Before applying the migration, verify all of the following on the target project:

1. `norautomatch_reject_immutable_mutation()` exists.
2. `crm_opportunities(workspace_id, opportunity_id)` has a unique key/index suitable for the Hunt foreign key.
3. `auth.users` exists.
4. roles `anon` and `authenticated` exist.
5. none of the three v13 tables already exist.
6. current CRM tables have RLS enabled and no direct anon/authenticated CRM SELECT grants.
7. GitHub Torque Inventory R0 CI passes with the executable PostgreSQL migration step.
8. exact migration bytes/commit are frozen before live activation.

If any check fails, STOP. Do not partially improvise a migration.

## Apply method

Use the Supabase migration API/tool, not ad hoc copy/paste into unrelated shells.

Apply exactly one named migration using the reviewed SQL file contents.

Suggested migration name:

`norautomatch_crm_v13_torque_hunts_scout_opportunities`

Do not combine unrelated schema or data changes in the same migration.

## Immediate post-apply verification

Verify:

- all three tables exist;
- all three tables have RLS enabled;
- `anon` has no direct privileges on any v13 table;
- `authenticated` has no direct privileges on any v13 table;
- Hunt foreign key points to the same-workspace CRM opportunity identity;
- Industry Scout immutable trigger exists;
- expected indexes exist;
- row counts are zero immediately after activation unless an explicitly authorized test writes data;
- existing CRM/Garage/MatchDNA row counts remain unchanged;
- existing CRM read/write health checks still pass.

## Application activation

Schema PASS does not authorize the feature branch for production.

After schema activation:

1. Keep production application code unchanged until a separate deployment decision.
2. Exercise the feature branch against a controlled preview/staging runtime if one can be bound to the database safely.
3. Create only synthetic/non-customer test Hunt data unless separately authorized.
4. Confirm Fresh Up -> Hunt persistence -> inventory refresh -> Watchtower read behavior.
5. Confirm customer-facing public Torque remains on verified-inventory truth rules.
6. Confirm no outbound message or external CRM write occurs automatically.

## Failure handling

The migration is create-only. If it fails before completion, record the exact database error and inspect actual schema state before any retry.

Do not issue DROP/TRUNCATE/DELETE as an automatic rollback.

If a partial schema state exists, reconcile object-by-object and prepare a bounded remediation migration. Destructive cleanup requires explicit owner approval.

## Authority statement

A successful database migration means only that the Watchtower persistence schema is present.

It does not authorize:
- deployment to production;
- customer messaging;
- dealer transfer promises;
- financing commitments;
- external CRM writes;
- paid provider activation;
- destructive database actions.
