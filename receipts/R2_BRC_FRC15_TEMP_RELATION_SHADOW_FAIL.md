# R2 BRC-FRC-15 temporary trust-anchor relation shadow FAIL

Exact frozen product candidate:
`61a57b7ed996dc804d1c60b857c2edca5c7d59f5`

Tree:
`73db8891089b3ddff55a17f336925f0e174b402d`

Role: separate Broad Release-Candidate Fresh Re-Challenger.

## Independent FRC-14 replay

The exact governed FRC-14 job was freshly re-run before the new challenge:
- workflow `37859729837`
- fresh job `113596817812`
- result: SUCCESS

The fresh replay independently re-established the immutable trust anchor and rejection of the original FRC-14 self-asserted GUC attack.

## First new material finding

**NORAUTOMATCH-R2-BRC-FRC-15 — TEMPORARY_RELATION_SHADOW_BYPASSES_PUBLICATION_SECRET_TRUST_ANCHOR**

The FRC-14 trust function references `crm_site_chat_publication_secret_anchor` without schema qualification.

A PostgreSQL session can create a temporary relation with the same name and place `pg_temp` ahead of `public` for relation lookup.

The security function then validates the attacker-selected secret digest against the attacker-controlled temporary anchor instead of the immutable production anchor.

## Fresh runtime reproduction

Evidence branch:
`evidence/r2-frc14-fresh-rechallenge-frc15-20261008`

The evidence branch changes only the challenger integration witness and workflow trigger/name relative to the frozen product candidate. No product file changed.

Workflow:
`37861440624`

Job:
`113597872936`

Result:
SUCCESS

Runtime sequence:
1. create a legitimate site-chat event and current owner;
2. choose attacker-controlled publication HMAC secret and matching publication proof;
3. open a direct-SQL transaction;
4. create temporary `crm_site_chat_publication_secret_anchor`;
5. populate the temp anchor with the attacker secret digest;
6. set local search path to `pg_temp, public`;
7. pre-seed an attacker access row and set the attacker secret GUC;
8. insert a direct-SQL reply;
9. deferred publication guard resolves the trust-anchor relation through the temp shadow and allows commit.

Preserved marker:
`FRC15_WITNESS temporary-table shadow bypassed publication secret trust anchor`

## Disposition

**BROAD_FRESH_RECHALLENGER_FAIL / BRC-FRC-15_OPEN / REMEDIATION_REQUIRED / NO_PRODUCTION_AUTHORITY**

Stopped at the first material new finding. No remediation, merge, deploy, or production activation occurred in the challenger role.
