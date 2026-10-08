# R2 BRC-FRC-15 broad rechallenge

Act as a new separate Broad Release-Candidate Fresh Re-Challenger.

Repository:
`norrijam405/NorAutoMatch`

Challenge only exact candidate:
`98f61d355b1c6127e3464338b81caeaa81381f66`

Tree:
`e368f5370efb0b8de65300b819819daa0c8a6b83`

Failed predecessor:
`61a57b7ed996dc804d1c60b857c2edca5c7d59f5`

Read:
- PR #77
- IgniAqua Control Plane issue #29
- prior BRC-FRC-15 FAIL receipt
- `receipts/R2_BRC_FRC15_SCHEMA_QUALIFIED_TRUST_PASS.md`

Do not remediate, merge, or deploy.

Re-test BRC-FRC-15 first:
- a direct-SQL session may create temporary relations with the same names as security-critical production relations, but those temp relations must carry no authority;
- temp `crm_site_chat_publication_secret_anchor` must not replace the immutable `public` anchor;
- temp `crm_site_chat_access` must not replace the authoritative `public` access relation used by the deferred guard;
- attacker-selected secret + matching forged publication proof + temp relation shadow must fail at deferred commit;
- forged reply must roll back and not persist;
- the hardened trust functions must retain fixed `pg_catalog, public` search paths and explicit `public` relation references;
- FRC-14 self-asserted transaction-local secret must remain closed;
- legitimate publication using the governed server secret must still succeed;
- real production bootstrap must install and record the FRC-15 migration.

Then re-test BRC-FRC-14 through BRC-FRC-01 and continue the complete remaining broad R2 release-candidate challenge matrix.

Stop at the first material new finding.

PASS does not authorize production.
