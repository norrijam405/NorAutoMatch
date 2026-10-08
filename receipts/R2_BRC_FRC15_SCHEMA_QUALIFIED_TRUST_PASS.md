# R2 BRC-FRC-15 schema-qualified publication trust remediation PASS

Failed product candidate:
`61a57b7ed996dc804d1c60b857c2edca5c7d59f5`

Failed tree:
`73db8891089b3ddff55a17f336925f0e174b402d`

Frozen successor:
`98f61d355b1c6127e3464338b81caeaa81381f66`

Tree:
`e368f5370efb0b8de65300b819819daa0c8a6b83`

Finding closed:
`NORAUTOMATCH-R2-BRC-FRC-15 — TEMPORARY_RELATION_SHADOW_BYPASSES_PUBLICATION_SECRET_TRUST_ANCHOR`

## Required pre-change runtime confirmation

Independent FRC-14 exact-head rerun:
- workflow `37859729837`
- fresh job `113596817812`
- SUCCESS

Fresh FRC-15 witness:
- workflow `37861440624`
- job `113597872936`
- SUCCESS
- marker: `FRC15_WITNESS temporary-table shadow bypassed publication secret trust anchor`

The witness proved a direct-SQL session could create a temporary relation named `crm_site_chat_publication_secret_anchor`, populate it with an attacker-selected digest, place `pg_temp` ahead of `public`, and cause the unqualified trust function to validate the attacker-selected secret.

## Remediation

A new versioned migration was added:

`infrastructure/norautomatch-site-chat-schema-qualified-trust-r5.sql`

Security-critical publication trust functions now:
- use fixed function `search_path = pg_catalog, public`;
- reference `public.crm_site_chat_publication_secret_anchor` explicitly;
- reference `public.crm_site_chat_access` explicitly;
- call the publication trust/proof validators through explicit `public` schema references.

Caller-controlled temporary relations therefore cannot replace authoritative production relations in the publication trust chain.

## Exact-head verification

Workflow:
`37861897406`

Job:
`113599352351`

Result:
**SUCCESS**

Verified:
- real production bootstrap installs and records the FRC-15 migration;
- production verifier confirms both hardened functions have fixed search_path;
- production verifier confirms trust-anchor relation is explicitly schema-qualified;
- production verifier confirms site-chat access relation is explicitly schema-qualified;
- FRC-15 temporary anchor-shadow attack fails with `SITE_CHAT_REPLY_AUTHENTIC_ACCESS_REQUIRED`;
- forged reply rolls back and does not persist;
- FRC-14 attacker-chosen GUC self-assertion remains closed;
- FRC-13 publication authenticity remains closed;
- FRC-12 browser-read authenticity remains closed;
- FRC-11 access capability immutability, last_seen_at, and expiry behavior remain intact;
- same-site ownership/expiry/revocation protections remain green;
- communication-truth regression remains green;
- secure-document binding regression remains green;
- production dependency security passes;
- full typecheck passes;
- production build passes.

State:
`REMEDIATION_BUILDER_PASS / BROAD_FRESH_RECHALLENGE_REQUIRED / NO_PRODUCTION_AUTHORITY`.
