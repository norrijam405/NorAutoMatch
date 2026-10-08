# R2 BRC-FRC-11 site-chat access capability rewrite FAIL

Date: 2026-10-08

## Bound product candidate

Exact frozen successor:
`3d41f642129b0912a6279fbf6b28e52f4c2f0d5e`

Tree:
`0a86b1f2386ef4e2d4232b1acf4389ef2646118f`

Role: separate Broad Release-Candidate Fresh Re-Challenger.

No remediation, merge, deploy, activation, live traffic, provider execution, or outbound communication was performed.

## Independent FRC-10 execution

A fresh rerun of the exact governed job completed successfully on the frozen product candidate:
- workflow run: `37679782707`
- fresh rerun job: `113189856396`

The fresh rerun re-established the production bootstrap, secure-document binding regression, communication-truth regression, same-site publication/immutability witnesses, typecheck, and production build.

## First new material finding

**NORAUTOMATCH-R2-BRC-FRC-11 — SITE_CHAT_ACCESS_CAPABILITY_REWRITABLE_BY_DIRECT_SQL_UPDATE**

The production schema treats `crm_site_chat_access.access_token_hash` as the browser capability authorizing customer thread reads, but there is no database truth/immutability guard preventing direct SQL from rewriting that capability after legitimate issuance.

`readSiteChatReplies()` trusts the stored hash directly. Therefore a database writer can replace the legitimate token hash with an attacker-chosen token hash and immediately convert that attacker-controlled token into a valid read capability for the existing customer thread.

## Fresh runtime witness

Evidence-only branch:
`evidence/r2-frc10-fresh-rechallenge-20261008`

The branch is exactly 2 commits ahead of the frozen candidate and changes only:
- the GitHub workflow branch trigger/name;
- the site-chat integration test harness.

No product file changed.

Evidence workflow:
- run: `37740887420`
- job: `113191076970`
- result: SUCCESS

Runtime witness:
1. establish a legitimate conversation, current owner, active site-chat access, and legitimate published replies;
2. compute an attacker-chosen token hash;
3. direct SQL UPDATE `crm_site_chat_access.access_token_hash` to the attacker hash;
4. read the thread with the attacker token;
5. observe the attacker token returns the existing published replies;
6. observe the original legitimate token no longer authorizes the thread.

Preserved workflow log marker:

`FRC11_WITNESS site-chat access capability hash rewrite authorized attacker-chosen token`

The inherited same-site regression continued to PASS afterward.

## Material impact

A direct SQL writer can replace a legitimate customer browser capability with a token it controls and read customer-visible thread content through the normal application read path. The database therefore does not preserve the authority boundary established when site-thread access is issued.

This is separate from FRC-09/FRC-10 reply publication truth: the reply rows remain authentic and immutable, but access to read them can be reassigned by direct SQL mutation of the capability itself.

## Disposition

**BROAD_FRESH_RECHALLENGER_FAIL / BRC-FRC-11_OPEN / REMEDIATION_REQUIRED / NO_PRODUCTION_AUTHORITY**

Stopped at the first material new finding.
