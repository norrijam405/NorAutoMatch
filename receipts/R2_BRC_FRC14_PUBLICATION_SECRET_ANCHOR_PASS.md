# R2 BRC-FRC-14 trusted publication-secret anchor remediation PASS

Failed product candidate:
`354d3f6e4cfd83f9f02df8ce34d1de3fd944d967`

Failed tree:
`238eddd3a9b8704d3a90689ccb4e118f1a9e7925`

Frozen successor:
`61a57b7ed996dc804d1c60b857c2edca5c7d59f5`

Tree:
`73db8891089b3ddff55a17f336925f0e174b402d`

Finding closed:
`NORAUTOMATCH-R2-BRC-FRC-14 — TRANSACTION_LOCAL_HMAC_SECRET_SELF_ASSERTION`

## Required pre-change runtime confirmation

Fresh FRC-14 witness:
- workflow `37859028703`
- job `113590077129`
- SUCCESS
- marker: `FRC14_WITNESS transaction-local HMAC secret self-assertion bypassed deferred publication guard`

The witness proved a direct-SQL writer could choose its own HMAC secret, forge a matching publication proof, set that secret into the transaction-local publication GUC, and satisfy the FRC-13 deferred publication guard.

## Remediation

A new versioned migration was added:

`infrastructure/norautomatch-site-chat-publication-secret-anchor-r4.sql`

The trusted current/previous publication HMAC secret digests are now bound by the production migration launcher inside the same transaction that applies the FRC-14 migration.

Only SHA-256 digests are stored in the database.

The migration creates immutable singleton:
`crm_site_chat_publication_secret_anchor`

The singleton:
- contains the trusted current secret digest;
- optionally contains the trusted previous secret digest;
- rejects UPDATE;
- rejects DELETE;
- rejects TRUNCATE;
- cannot be attacker-prebound because creation + binding occurs inside the same governed migration transaction.

Runtime function:
`norauto_site_chat_publication_secret_trusted(text)`

The deferred publication guard now accepts a transaction-local current/previous secret only when its SHA-256 digest matches the immutable bootstrap anchor.

Therefore transaction-local GUC values remain only transport; they no longer self-assert trust.

Secret rotation is intentionally fail-closed and explicit. A new current/previous production secret must be accompanied by a governed migration that updates the immutable anchor; changing runtime environment secrets alone will not silently grant publication authority.

## Exact-head verification

Workflow:
`37859729837`

Job:
`113592334306`

Result:
**SUCCESS**

Verified:
- real production launcher receives the governed HMAC secret during migration;
- FRC-14 migration applies successfully;
- trust anchor is bound during the migration transaction;
- production verifier independently hashes the configured secret and matches it to the stored anchor digest;
- anchor relation exists;
- anchor UPDATE/DELETE and TRUNCATE protection triggers exist;
- trusted-secret validator exists;
- repeated startup detects the exact migration checksum and remains idempotent;
- attacker-chosen transaction-local secret + matching forged publication proof is rejected at deferred commit;
- forged reply rolls back and does not persist;
- legitimate FRC-13 application publication with the real server secret remains functional;
- FRC-12 browser-read authenticity remains intact;
- FRC-11 capability immutability, last_seen_at, and expiry semantics remain intact;
- same-site ownership and publication races remain green;
- communication-truth regression remains green;
- secure-document binding regression remains green;
- production dependency security passes;
- full typecheck passes;
- production build passes.

State:
`REMEDIATION_BUILDER_PASS / BROAD_FRESH_RECHALLENGE_REQUIRED / NO_PRODUCTION_AUTHORITY`.
