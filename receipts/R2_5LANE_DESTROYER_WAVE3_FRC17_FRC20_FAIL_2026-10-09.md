# NorAutoMatch R2 Five-Lane Destroyer Wave 3 — Four Findings

Date: 2026-10-09

Frozen product candidate:
`e7f4c5bfc64ec898e885b9b2cb31b461e5cfd1a7`

Frozen product tree:
`195b81bc6459570e8409cade05ec51c4cc064f7f`

Authoritative challenge run:
`37995588582`

Aggregate:
`FIVE_LANE_FINDINGS_PRESENT`

## D1 — FAIL / BRC-FRC-17

`NORAUTOMATCH-R2-BRC-FRC-17 — SELF_ASSERTED_VIDEO_PUBLICATION_EVIDENCE_ACCEPTED_AS_PUBLISHED_TRUTH`

Historical video publication truth witness passed first.

Fresh attack then showed that a non-empty arbitrary string such as `self-asserted-reference` satisfies the database PUBLISHED-evidence constraint. The database therefore accepts PUBLISHED social metadata without independently authenticated provider evidence.

Observed:
`NEW_FINDING_D1_SELF_ASSERTED_VIDEO_PUBLICATION_EVIDENCE_ACCEPTED`

## D2 — FAIL / BRC-FRC-18

`NORAUTOMATCH-R2-BRC-FRC-18 — PRESEEDED_MIGRATION_LEDGER_CAN_SUPPRESS_UNAPPLIED_SECURITY_MIGRATIONS`

Fresh attack pre-seeded `norautomatch_schema_migrations` with the exact expected SHA-256 values for v13 and v14 before the actual schema objects existed.

The production migration runner trusted those rows and skipped the migrations, leaving required security relations absent.

Observed:
`NEW_FINDING_D2_PRESEEDED_MIGRATION_LEDGER_SKIPS_UNAPPLIED_SECURITY_MIGRATIONS`

## D3 — FAIL / BRC-FRC-19

`NORAUTOMATCH-R2-BRC-FRC-19 — TEMP_RELATION_SHADOW_CAN_MINT_COMMUNICATION_EXECUTION_TRUTH`

Historical communication-ledger truth witness passed first.

Fresh attack created temporary `crm_conversation_events` and `crm_conversation_assignments`, set `search_path=pg_temp,public`, and caused the communication insert-truth trigger to resolve caller-controlled temporary relations. A forged outbound execution row committed.

Observed:
`NEW_FINDING_D3_TEMP_RELATION_SHADOW_MINTS_COMMUNICATION_EXECUTION_TRUTH`

## D4 — FAIL / BRC-FRC-20

`NORAUTOMATCH-R2-BRC-FRC-20 — TEMP_RELATION_SHADOW_BYPASSES_SITE_CHAT_EVENT_OWNER_TRUTH`

Historical site-chat FRC-12 through FRC-15 surface passed first.

Fresh attack preserved the legitimate publication-authentication path but shadowed the event/assignment relations used by the site-chat insert-truth function. A forged event/owner identity was accepted.

Observed:
`NEW_FINDING_D4_TEMP_RELATION_SHADOW_BYPASSES_SITE_CHAT_EVENT_OWNER_TRUTH`

## D5 — PASS

Fresh UPSERT/conflict mutation attempt against an authentic site-chat access capability was rejected by the immutable-capability guard.

Observed:
`PASS D5 site-chat access UPSERT cannot mutate capability`

## Lane status

`D1=FAIL / D2=FAIL / D3=FAIL / D4=FAIL / D5=PASS`

Each failed lane must be remediated separately and independently re-challenged.
D5 requires no remediation.

No merge.
No deployment.
No production authority.
