# NorAutoMatch R2 BRC-FRC-18 Fresh Re-Challenge PASS

Date: 2026-10-09

Finding:
`NORAUTOMATCH-R2-BRC-FRC-18 — PRESEEDED_MIGRATION_LEDGER_CAN_SUPPRESS_UNAPPLIED_SECURITY_MIGRATIONS`

Frozen remediation successor:
`9eb148fe686253bafac7cf1a4e46b061aaf69e9d`

Frozen successor tree:
`54e97548152a73b2d50de8fa6bb58d2eee0828cb`

Builder verification run:
`37996131479`

Independent Fresh Re-Challenge run:
`37996605814`

Result:
`FRC18_INDEPENDENT_RECHALLENGE_PASS`

Verified:
- migration ledger entries no longer stand alone as proof of installation;
- pre-seeded exact hashes for v13/v14 fail closed when required security invariants are absent;
- fresh variation pre-seeding only v14 while earlier migrations install normally also fails closed;
- normal production bootstrap remains functional;
- idempotent rerun remains functional;
- secure-document, communication, site-chat, dependency audit, typecheck and production build regressions pass.

Status:
`FRC-18 CLOSED PASS / BROAD R2 CHALLENGE CONTINUES / NO PRODUCTION AUTHORITY`

No merge.
No deployment.
No production authority.
