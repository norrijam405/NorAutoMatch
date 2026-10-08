# R2 BRC-FRC-13 unauthenticated access row activates reply publication FAIL

Exact frozen product candidate:
`44580f8fde04a4d75f32f8e70a927ed96c0d65d4`

Tree:
`ca79980fcbcbfc6d524eaf3e89de21b1336921cc`

Role: separate Broad Release-Candidate Fresh Re-Challenger.

## Finding

**NORAUTOMATCH-R2-BRC-FRC-13 — UNAUTHENTICATED_PREISSUANCE_ROW_ACTIVATES_REPLY_PUBLICATION**

FRC-12 authenticates browser-thread reads, but publication eligibility still accepts any unexpired `crm_site_chat_access` row.

Affected controls:
- `publishSiteChatReply()` checks only for an unexpired row;
- `norauto_enforce_site_chat_reply_access_at_commit()` checks only for an unexpired row.

Therefore a direct SQL writer can pre-seed an unauthenticated access row with a future expiry and activate representative publication into a thread that never completed authenticated site-chat issuance.

This finding concerns publication authority, not attacker read authority.

## Fresh runtime reproduction

Evidence branch:
`evidence/r2-frc12-fresh-rechallenge-frc13-20261008`

The branch changes only the challenger test harness and workflow trigger/name relative to the frozen product candidate. No product file changed.

Workflow:
`37845829211`

Job:
`113546335377`

Result:
SUCCESS

Runtime sequence:
1. create a legitimate NORAUTO_SITE_CHAT event and current assigned representative;
2. direct SQL INSERT an access row with a future expiry and no authenticated issuance proof;
3. call `publishSiteChatReply()` as the otherwise-authorized current owner;
4. observe the publication succeeds;
5. verify the customer-visible reply row persists.

Preserved marker:
`FRC13_WITNESS unauthenticated preissuance access row activated reply publication`

The FRC-12 read-authentication regression and inherited same-site regressions remained green in the same job.

## Disposition

**BROAD_FRESH_RECHALLENGER_FAIL / BRC-FRC-13_OPEN / REMEDIATION_REQUIRED / NO_PRODUCTION_AUTHORITY**

Stopped at the first material new finding. No remediation, merge, deploy, or production activation occurred in this challenger role.
