# R2 BRC-FRC-13 authenticated site-chat publication remediation PASS

Failed product candidate:
`44580f8fde04a4d75f32f8e70a927ed96c0d65d4`

Failed tree:
`ca79980fcbcbfc6d524eaf3e89de21b1336921cc`

Frozen successor:
`354d3f6e4cfd83f9f02df8ce34d1de3fd944d967`

Tree:
`238eddd3a9b8704d3a90689ccb4e118f1a9e7925`

Finding closed:
`NORAUTOMATCH-R2-BRC-FRC-13 — UNAUTHENTICATED_PREISSUANCE_ROW_ACTIVATES_REPLY_PUBLICATION`

## Required pre-change runtime confirmation

Fresh FRC-13 witness:
- workflow `37845829211`
- job `113546335377`
- SUCCESS
- marker: `FRC13_WITNESS unauthenticated preissuance access row activated reply publication`

The witness proved an otherwise-authorized representative could publish when the only active access row was unauthenticated and pre-seeded directly in SQL.

## Remediation

A new versioned migration was added:

`infrastructure/norautomatch-site-chat-publication-authenticity-r3.sql`

It adds:
- `publication_proof` on `crm_site_chat_access`;
- `pgcrypto` HMAC verification support;
- a database HMAC validator bound to workspace + conversation + access-token verifier;
- a deferred commit guard that requires an unexpired access row whose publication proof validates with the transaction-local current or previous server secret;
- FRC-11 immutability coverage extended to `publication_proof`.

The application publication path now:
- requires a row whose FRC-12 issuance proof is authentic;
- independently requires a valid publication proof;
- sets the current/previous server HMAC secrets only as transaction-local PostgreSQL settings for the deferred database guard;
- fails closed with `SITE_CHAT_REPLY_AUTHENTIC_ACCESS_REQUIRED` when no authentic active row exists.

Null or arbitrary proof-looking rows do not activate publication.

## Exact-head verification

Workflow:
`37846766219`

Job:
`113549454588`

Result:
**SUCCESS**

Verified:
- production startup installs and records `norautomatch-site-chat-publication-authenticity-r3.sql`;
- repeated startup is checksum-clean/idempotent;
- production verifier confirms pgcrypto, publication_proof, FRC-13 validator function, and prior guards;
- application publication rejects unauthenticated active rows;
- deferred DB guard rejects direct-SQL reply insertion without an authenticated publication context;
- forged issuance/publication proof-looking rows do not activate publication;
- legitimate application issuance followed by current-owner publication succeeds;
- FRC-12 pre-issuance attacker row remains unauthenticated and does not block legitimate capability;
- FRC-11 access capability immutability remains intact;
- legitimate last_seen_at activity remains functional;
- authenticated expiry remains fail-closed;
- prior same-site ownership/expiry/revocation protections remain green;
- communication-truth regression remains green;
- secure-document binding regression remains green;
- production dependency security passes;
- full typecheck passes;
- production build passes.

An initial CI attempt failed only because the inherited expiry fixture directly manufactured an unauthenticated short-lived access row. The test fixture was corrected to use legitimate authenticated issuance with a backdated issuance time; no product policy was relaxed.

State:
`REMEDIATION_BUILDER_PASS / BROAD_FRESH_RECHALLENGE_REQUIRED / NO_PRODUCTION_AUTHORITY`.
