# NorAutoMatch R2 BRC-FRC-20 Fresh Re-Challenge PASS

Date: 2026-10-09

Finding:
`NORAUTOMATCH-R2-BRC-FRC-20 — TEMP_RELATION_SHADOW_BYPASSES_SITE_CHAT_EVENT_OWNER_TRUTH`

Frozen remediation successor:
`7b996c3ced259af70439484da13ca285438edc20`

Frozen successor tree:
`b829f8f3e8af50c6b12c4d4632cb9a860048e561`

Independent Fresh Re-Challenge run:
`37996564141`

Result:
`FRC20_INDEPENDENT_RECHALLENGE_PASS`

Verified:
- historical site-chat FRC-12 through FRC-15 surface remains green;
- caller-created temporary event/assignment relations carry no site-chat publication authority;
- attacker-controlled persistent schema relations placed first in session search_path carry no event/owner authority;
- insert-truth function uses fixed `pg_catalog, public` resolution and explicit `public.*` authority relations;
- site-chat capability immutability remains intact;
- secure-document and communication regressions remain green;
- dependency audit, typecheck and production build pass.

Status:
`FRC-20 CLOSED PASS / BROAD R2 CHALLENGE CONTINUES / NO PRODUCTION AUTHORITY`

No merge.
No deployment.
No production authority.
