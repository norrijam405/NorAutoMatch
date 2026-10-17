# Watchtower Supabase schema preflight — read-only verification
Date: 2026-10-14
Supabase project: peyrnfeytjgsuxqxloxt (NorAutoMatch)
Candidate branch: remediation/2026-10-13-scout-hunt-relevance-gate
SQL: infrastructure/norautomatch-crm-v13-torque-hunts-scout-opportunities.sql

## Database inspection
- Existing public.crm_opportunities primary key: (opportunity_id).
- Independently inspected existing index: crm_opportunity_workspace_id_unique — CREATE UNIQUE INDEX on public.crm_opportunities (workspace_id, opportunity_id), non-partial.
- Therefore the proposed composite Vehicle Hunt foreign key already has a suitable unique referenced key; do not add another index.
- Existing public function norautomatch_reject_immutable_mutation was confirmed present.
- Prior table inventory showed no torque_vehicle_hunts, industry_scout_observations, or scout_opportunity_matches.
- This preflight checked selected prerequisites only, not the full migration's execution or privileges. No readiness PASS is claimed.
- No database mutations performed.

## Next gated proof
Run the exact current migration and persistence suite against isolated test PostgreSQL using one batched CI run. Do not apply it to the existing NorAutoMatch Supabase project until the scope, authority, and migration impact have been checked. Do not claim browser Watchtower readiness until the candidate is actually deployed and login tested.

## Cost/authority
Actions on remediation branch are workflow_dispatch only. No Actions workflow dispatched in this preflight. No live customer data, paid infrastructure, or production release was touched.
