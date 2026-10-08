# R2 BRC-FRC-12 pre-issuance site-chat capability takeover FAIL

Exact frozen product candidate:
`5bac3306f9f2dccf9b01d667e5832f241ce6fcfb`

Tree:
`9c924f2678ac533b60841da3349f91415131b0f3`

Role: separate Broad Release-Candidate Fresh Re-Challenger.

## Fresh FRC-11 execution

The exact FRC-11 remediation job was freshly re-run before the new witness:
- workflow: `37778946554`
- fresh job: `113537496491`
- result: SUCCESS

## First new material finding

**NORAUTOMATCH-R2-BRC-FRC-12 — SITE_CHAT_ACCESS_PREISSUANCE_INSERT_TAKEOVER**

FRC-11 protects issued `crm_site_chat_access` rows against UPDATE, DELETE, and TRUNCATE, but initial INSERT remains an untrusted authority boundary.

A direct SQL writer can insert an attacker-chosen `access_token_hash` for a legitimate conversation before the application registers the browser token. The application then sees the existing row, rejects the legitimate token with `SITE_CHAT_ACCESS_IDENTITY_COLLISION`, and continues to trust the attacker-controlled stored hash on thread reads.

## Fresh runtime reproduction

Evidence branch:
`evidence/r2-frc11-fresh-rechallenge-20261008`

The evidence branch differs from the frozen product candidate only by the challenger integration witness and workflow branch trigger/name. No product file changed.

Workflow:
`37843544891`

Job:
`113538656648`

Result:
SUCCESS

Runtime sequence:
1. create a legitimate NORAUTO_SITE_CHAT conversation event and current assignment;
2. before legitimate access registration, direct SQL INSERT an attacker-chosen access-token hash;
3. call legitimate `registerSiteChatAccess()` and observe `SITE_CHAT_ACCESS_IDENTITY_COLLISION`;
4. publish a legitimate current-owner reply;
5. read through `readSiteChatReplies()` using the attacker token and receive the legitimate reply;
6. read using the intended legitimate token and receive no replies.

Preserved marker:
`FRC12_WITNESS pre-issuance site-chat capability takeover reproduced`

## Disposition

**BROAD_FRESH_RECHALLENGER_FAIL / BRC-FRC-12_OPEN / REMEDIATION_REQUIRED / NO_PRODUCTION_AUTHORITY**

Stopped at the first material new finding. No remediation, merge, deploy, or production activation occurred in this challenger role.
