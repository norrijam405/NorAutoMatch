# NorAutoMatch House v1 read-only handshake R0

**Status:** app-side implementation candidate; not deployed  
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
- Exact request keys, fixed sender/recipient, 90-second timestamp window, 128-bit hex nonce, 16 KiB request-body ceiling, and constant-time signature comparison.

## Response

The endpoint returns:
- schema igniaqua.house.app-handshake.v1;
- sender norautomatch and recipient IGNIAQUA_CONTROL_PANEL;
- scope READ_ONLY_HEARTBEAT;
- writes_authorized false;
- replay_protection PROCESS_LOCAL by default, or DURABLE only when the optional file-backed store is configured;
- an empty capability list (no product capability is being asserted);
- a response HMAC covering the canonical empty capability manifest.

## Replay and persistence boundary

Default local mode is process-local. It rejects replay during the current process lifetime and fails closed when its 10,000-entry cache is full; it no longer evicts live nonce entries.

For restart-persistent replay protection, set IGNIAQUA_NORAUTOMATCH_HOUSE_REPLAY_DIR to a directory on an explicitly mounted persistent volume. In that mode:
- only SHA-256 nonce hashes and expiry timestamps are stored; raw nonces are never persisted;
- exclusive file creation rejects concurrent duplicate challenges;
- entries are retained for 180 seconds, longer than the 90-second request acceptance window;
- expired entries are pruned, and the store fails closed if unavailable or at its 10,000-entry safety cap;
- the handler returns 503 on storage failure instead of silently downgrading to process-local mode.

The app tests recreate the handler against the same directory and confirm that a previously accepted challenge is rejected. A configured path is not proof that the hosting provider preserves the volume across deployment replacement. The Control Panel must continue to report durable replay protection as independently unverified until the actual mounted-volume and deployment behavior is proven.

## Release boundary

A successful handshake proves only that the responding NorAutoMatch process possesses the dedicated House secret and can sign the fixed read-only identity response. It does not prove Render deployment parity, inventory truth, dealer/customer data access, tenant isolation, live inventory, or operational readiness. The endpoint, replay directory, and secret are not deployed or configured by this draft PR.
