# R2 BRC-FRC-11 site-chat access capability integrity remediation PASS

Failed product candidate:
`3d41f642129b0912a6279fbf6b28e52f4c2f0d5e`

Frozen predecessor tree:
`0a86b1f2386ef4e2d4232b1acf4389ef2646118f`

Successor:
`5bac3306f9f2dccf9b01d667e5832f241ce6fcfb`

Tree:
`9c924f2678ac533b60841da3349f91415131b0f3`

Finding closed:
`NORAUTOMATCH-R2-BRC-FRC-11 — SITE_CHAT_ACCESS_CAPABILITY_REWRITABLE_BY_DIRECT_SQL_UPDATE`

## Required pre-change reproduction

The preserved exploit was independently re-executed before any remediation using fresh PostgreSQL runtime execution:
- workflow run: `37740887420`
- fresh builder reproduction job: `113314567945`

The fresh runtime again recorded:
`FRC11_WITNESS site-chat access capability hash rewrite authorized attacker-chosen token`

Thus the remediation began only after the required exploit reproduction was satisfied.

## Remediation

A new versioned production migration was added:

`infrastructure/norautomatch-site-chat-access-integrity-r1.sql`

It preserves legitimate initial issuance and legitimate `last_seen_at` activity while making the issued capability boundary fail closed:
- `workspace_id` immutable after issuance;
- `conversation_id` immutable after issuance;
- `access_token_hash` immutable after issuance;
- `created_at` immutable after issuance;
- `expires_at` immutable after issuance;
- `last_seen_at` remains updatable and cannot regress;
- DELETE is rejected to prevent delete-and-reissue takeover;
- TRUNCATE is rejected.

The real production migration launcher installs and records this new migration. The existing site-chat migration was not rewritten, avoiding checksum drift for already-recorded production schema history.

The prior expiry regression was adapted so it creates a short-lived test capability at issuance rather than bypassing the new authority boundary with a direct `expires_at` UPDATE.

## Exact-head verification

Workflow:
`37778946554`

Job:
`113316846079`

Result:
**SUCCESS**

Verified on PostgreSQL 17 production-bootstrap path:
- direct SQL rewrite of `access_token_hash` rejected;
- direct SQL extension/rewrite of `expires_at` rejected;
- direct SQL reassignment of workspace identity rejected;
- direct SQL reassignment of conversation identity rejected;
- DELETE rejected;
- TRUNCATE rejected;
- attacker-chosen token remains unauthorized;
- legitimate browser capability remains authorized;
- legitimate thread reads still update `last_seen_at`;
- legitimate initial access issuance still works;
- expiry still fails closed without rewriting protected expiry;
- FRC-10 through inherited same-site publication protections remain green;
- communication-truth regression remains green;
- secure-document binding regression remains green;
- production migration rerun remains checksum-clean/idempotent;
- production dependency security passes;
- full typecheck passes;
- production build passes.

State:
`REMEDIATION_BUILDER_PASS / BROAD_FRESH_RECHALLENGE_REQUIRED / NO_PRODUCTION_AUTHORITY`.
