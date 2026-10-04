# NorAutoMatch R2 Inventory Runtime Authority Preparation — 2026-10-03

## Purpose

Prepare the existing zero-cost NorAutoMatch Supabase project for real durable inventory-cache runtime activation without granting the cache worker access to customer CRM data.

## Project

- Supabase project: `peyrnfeytjgsuxqxloxt`
- database host: `db.peyrnfeytjgsuxqxloxt.supabase.co`
- PostgreSQL: 17.11
- region: `us-east-2`

## Cache DDL

V12 and V13 are installed.

Active runtime tables:
- `igniaqua.inventory_provider_snapshots`
- `igniaqua.inventory_provider_current_state`

Both have RLS enabled and no browser policies.

Legacy V12 public cache tables remain deny-by-default for evidence/migration continuity.

No inventory rows were fabricated or seeded.

## Least-privilege runtime role

Created:

`norauto_inventory_runtime`

Current state:
- LOGIN: disabled pending explicit credential activation
- `igniaqua` schema USAGE: yes
- private snapshots SELECT: yes
- private snapshots INSERT: yes
- private current-state UPDATE: yes
- CRM opportunity SELECT: **no**

The role therefore has the cache privileges needed for provider sync/readback while lacking customer CRM read authority.

Runtime safety limits:
- statement timeout: 15 seconds
- idle-in-transaction timeout: 15 seconds

A password/login was deliberately not created through automation because credential-setting was blocked by the connected database safety boundary. The remaining credential activation is therefore a narrow founder/dashboard gate rather than a reason to widen database privileges.

## Candidate software

PR #39 exact candidate:
- head: `15ca730a685f7b52a09f6cbeaa3c739fbbed86a7`
- tree: `df77c9e4207c5148e8cee0e4206da8339890ed13`
- Inventory Provider Cache CI `37171814592`: SUCCESS

The launcher supports:
- `NORAUTO_INVENTORY_DATABASE_URL`
- `NORAUTO_SKIP_INVENTORY_MIGRATIONS=1`

This lets the live service use externally governed V12/V13 DDL without granting the runtime role schema-creation authority.

## Remaining founder gate

Enable LOGIN for `norauto_inventory_runtime` with a strong private password and place the resulting Postgres URI directly into Render as `NORAUTO_INVENTORY_DATABASE_URL`.

Do not paste the password or URI into ChatGPT/GitHub.

After that gate:
1. run real Orr sync
2. verify persisted provenance/freshness/readback
3. prove cache-first reads
4. prove stale/unavailable verified-live fallback
5. freeze candidate
6. independent challenge/assurance

Authority effect: NONE.
