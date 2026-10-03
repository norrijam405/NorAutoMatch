# NorAutoMatch Supabase R1 Security Lockdown + Live Auth Cutover — 2026-10-03

## Target

Dedicated Supabase organization: NorAutoMatch
Dedicated project: NorAutoMatch
Project ref: `peyrnfeytjgsuxqxloxt`
Region: `us-east-2`
Project state at cutover: `ACTIVE_HEALTHY`

## Installed governed schema

Applied to the dedicated project:
- R1 CRM migrations v1 through v11
- R1 customer Supabase foundation
- R1 Garage / Match DNA / Market Scout schema
- auth-user bootstrap trigger
- owner-scoped customer RLS policies

Optional V1.1 durable inventory-cache migrations were intentionally not included in this R1 cutover.

## CRM browser-role hardening

Browser grants for `anon` and `authenticated` were revoked from all CRM tables.

RLS was then enabled on all server-only CRM tables with no browser policies:
- crm_opportunities
- crm_evidence
- crm_manager_review_receipts
- crm_outbox
- crm_follow_up_obligations
- crm_manager_handoffs
- crm_conversation_events
- crm_machine_assertion_nonces
- public_abuse_buckets
- crm_data_lifecycle
- crm_data_lifecycle_conversation_targets
- crm_data_lifecycle_redaction_receipts
- crm_data_lifecycle_legal_holds
- crm_manager_session_revocations

Post-change table inspection confirms RLS enabled on all CRM tables and all customer tables.

Supabase advisor now reports `RLS Enabled No Policy` for the server-only CRM tables. This is intentional for those tables: no direct anon/authenticated access is authorized.

Remaining security warnings:
- 9 functions report mutable `search_path`; these remain a separate hardening item and were not silently changed during this cutover.

## Live Render auth cutover

Service: `norautomatch-live`
Service ID: `srv-dakr4qlbedkc73c75pi0`
Application SHA: `85ed2b232c7202039d411591f116a67cd55b4a0f`
Deploy: `dep-db0lp31srm7s7385ep7g`
Deploy state: `LIVE`

Live environment now points to the dedicated NorAutoMatch Supabase project URL and its browser-safe publishable key.

No service-role key was exposed or added to the browser environment.

## Current human proof still required

Fresh signup proof:
`Create account -> confirmation email -> click confirmation -> enter confirmed account`

Garage persistence across sign-out/re-auth remains previously banked and need not be repeated unless a new regression appears.

Authority effect: NONE.
