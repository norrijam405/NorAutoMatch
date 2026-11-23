# NorAutoMatch House v1 read-only handshake R0

**Status:** draft implementation candidate; not deployed  
**Endpoint:** POST /api/house/v1/handshake  
**App identity:** norautomatch  
**Control Panel identity:** IGNIAQUA_CONTROL_PANEL

## Purpose

Provide the IgniAqua Control Panel with a signed, read-only identity heartbeat. This endpoint does not query dealer inventory, customer records, CRM data, or the database. It does not create receipts or authorize product operations.

## Authentication

- Dedicated environment variable: IGNIAQUA_NORAUTOMATCH_CONTROL_PANEL_SECRET.
- Minimum 32 UTF-8 bytes.
- Must be independent from NORAUTO_MANAGER_API_TOKEN, NORAUTO_INTERNAL_API_TOKEN, NORAUTO_ADMIN_TOKEN, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL, and IGNIAQUA_OPERATOR_TOKEN.
- HMAC-SHA256 request and response signatures use the shared House v1 newline-delimited canonical messages.
- Exact request keys, fixed sender/recipient, 90-second timestamp window, 128-bit hex nonce, 16 KiB request-body ceiling, no redirects, and constant-time signature comparison.

## Response

The endpoint returns:
- schema igniaqua.house.app-handshake.v1;
- sender norautomatch and recipient IGNIAQUA_CONTROL_PANEL;
- scope READ_ONLY_HEARTBEAT;
- writes_authorized false;
- replay_protection PROCESS_LOCAL;
- an empty capability list (no product capability is being asserted);
- a response HMAC covering the canonical empty capability manifest.

## Replay and persistence boundary

Nonce replay is denied within the running Node process. The cache is intentionally process-local and resets after restart. The response does not claim durable replay protection. No DB table, migration, receipt, durable ledger, or other persistence is added.

## Release boundary

A successful handshake proves only that the responding NorAutoMatch process possesses the dedicated House secret and can sign the fixed read-only identity response. It does not prove Render deployment parity, inventory truth, dealer/customer data access, tenant isolation, live inventory, or operational readiness. The endpoint and secret are not deployed or configured by this draft PR.
