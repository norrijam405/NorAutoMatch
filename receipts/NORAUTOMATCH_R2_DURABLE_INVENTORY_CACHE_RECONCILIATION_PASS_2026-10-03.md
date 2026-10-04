# NorAutoMatch R2 Durable Inventory Cache Reconciliation PASS — 2026-10-03

## Active candidate

PR #39 — R2 reconcile durable inventory cache onto canonical main

- branch: `feature/2026-10-04-durable-inventory-cache-r2-reconcile`
- exact head: `15ca730a685f7b52a09f6cbeaa3c739fbbed86a7`
- exact tree: `df77c9e4207c5148e8cee0e4206da8339890ed13`
- base: canonical main `71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`
- mergeable: yes
- state: DRAFT pending runtime activation and independent assurance

Stale stacked PR #32 is closed as superseded and must not be merged.

## Software proof

Inventory Provider Cache CI:
- run: `37171814592`
- conclusion: **SUCCESS**

The successful run covered:
- production dependency audit gate
- separate CRM and inventory Postgres authorities
- repeat/idempotent checksum-bound migrations
- V12 provider cache + V13 private cache migration
- provider-neutral cache behavior
- Postgres persistence challenges
- inventory persistence isolation from CRM authority
- customer-path source isolation
- TypeScript
- production build

## Reconciled behavior

The candidate:
- introduces `NORAUTO_INVENTORY_DATABASE_URL`
- preserves `NORAUTO_SKIP_CRM_MIGRATIONS`
- introduces `NORAUTO_SKIP_INVENTORY_MIGRATIONS`
- separates CRM V1-V11 from inventory V12-V13 migration authorities
- fails closed if configured CRM and inventory URLs are exactly identical
- moves active cache reads/writes to private `igniaqua` tables
- preserves legacy public V12 tables deny-by-default for continuity
- routes real provider sync through the dedicated inventory authority
- preserves sellable in-transit inventory
- preserves source-supported body/category labels
- keeps verified-live provider fallback separately governed

## Zero-cost Supabase storage preparation

Existing dedicated NorAutoMatch Supabase:
- project: `peyrnfeytjgsuxqxloxt`
- region: `us-east-2`
- PostgreSQL: 17.11

Exact V12/V13 DDL was applied without fabricated rows.

Verified cache tables:
- `igniaqua.inventory_provider_snapshots` — RLS enabled
- `igniaqua.inventory_provider_current_state` — RLS enabled
- `public.inventory_provider_snapshots` — RLS enabled
- `public.inventory_provider_current_state` — RLS enabled

Browser-role verification:
- no anon/authenticated/public grants on cache tables

Current row counts:
- private snapshots: 0
- private current states: 0
- legacy public snapshots: 0
- legacy public current states: 0

No fake inventory was inserted merely to claim activation.

Security advisor state after DDL:
- cache tables: intentional INFO `RLS Enabled No Policy` only
- no cache-specific WARN/ERROR introduced
- unrelated existing leaked-password-protection warning remains outside this lane

Performance advisor state:
- unused cache indexes reported INFO before first real writes, as expected

## Remaining activation gate

The durable cache is **NOT yet customer-active**.

Required next evidence:
1. server-side Postgres connection for the prepared inventory authority
2. real Orr sync against that authority
3. persisted source provenance / freshness / current-state readback
4. live cache-first read proof
5. stale/unavailable cache fallback proof
6. separate Fresh Challenger / Independent Assurance against this exact frozen candidate
7. only then merge/promote

No paid infrastructure.
No unrelated V1.1 promotion.
No weakening of verified-live fallback.

## Disposition

**SOFTWARE_AND_STORAGE_BOUNDARY_PASS / RUNTIME_CONNECTION_GATE_OPEN / NOT YET CACHE_PRODUCTION_READY**

Authority effect: NONE.
