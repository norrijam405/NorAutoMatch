# R2 BRC-FRC-12 pre-issuance site-chat capability authenticity remediation PASS

Failed product candidate:
`5bac3306f9f2dccf9b01d667e5832f241ce6fcfb`

Failed tree:
`9c924f2678ac533b60841da3349f91415131b0f3`

Frozen successor:
`44580f8fde04a4d75f32f8e70a927ed96c0d65d4`

Tree:
`ca79980fcbcbfc6d524eaf3e89de21b1336921cc`

Finding closed:
`NORAUTOMATCH-R2-BRC-FRC-12 — SITE_CHAT_ACCESS_PREISSUANCE_INSERT_TAKEOVER`

## Required pre-change runtime confirmation

Fresh FRC-11 exact-head rerun:
- workflow `37778946554`
- fresh job `113537496491`
- SUCCESS

Fresh FRC-12 witness:
- workflow `37843544891`
- job `113538656648`
- SUCCESS
- marker: `FRC12_WITNESS pre-issuance site-chat capability takeover reproduced`

The witness proved a database-only attacker could pre-seed an attacker-controlled capability, force legitimate registration into identity collision, then use the attacker token to read a legitimate published thread.

## Remediation

A new versioned migration was added:

`infrastructure/norautomatch-site-chat-access-authenticity-r2.sql`

The application now stores a server-HMAC token verifier bound to:
- workspace;
- conversation;
- browser token.

Each legitimate issuance also stores a separate server-HMAC issuance proof bound to:
- workspace;
- conversation;
- verifier hash;
- created_at;
- expires_at.

Raw browser tokens are never stored.

The runtime validates both verifier and issuance proof using the server-side HMAC secret. Unauthenticated direct-SQL rows carry no read authority.

The access primary key is now:
`(workspace_id, conversation_id, access_token_hash)`

This permits attacker junk rows to coexist without blocking the one authenticated application-issued capability. Existing FRC-11 post-issuance immutability remains in force, including immutable issuance proof.

The real production launcher installs and records the new migration.

## Exact-head remediation verification

Workflow:
`37844877421`

Job:
`113543140761`

Result:
**SUCCESS**

Verified:
- attacker pre-seeded access row does not block legitimate registration;
- attacker pre-seeded token remains unauthorized;
- legitimate token reads the legitimate thread;
- raw token is never stored;
- capability verifier is bound to workspace + conversation;
- unauthenticated issuance proof is ignored;
- FRC-11 access_token_hash rewrite remains rejected;
- FRC-11 expires_at rewrite remains rejected;
- workspace/conversation reassignment remains rejected;
- DELETE remains rejected;
- TRUNCATE remains rejected;
- legitimate last_seen_at updates remain functional;
- legitimate initial issuance remains functional;
- expiry remains fail-closed;
- production bootstrap records the FRC-12 migration;
- issuance_proof column exists;
- production primary key shape is verified;
- secure-document and communication-truth regressions remain green;
- FRC-10 and inherited same-site reply protections remain green;
- production dependency security passes;
- full typecheck passes;
- production build passes.

State:
`REMEDIATION_BUILDER_PASS / BROAD_FRESH_RECHALLENGE_REQUIRED / NO_PRODUCTION_AUTHORITY`.
