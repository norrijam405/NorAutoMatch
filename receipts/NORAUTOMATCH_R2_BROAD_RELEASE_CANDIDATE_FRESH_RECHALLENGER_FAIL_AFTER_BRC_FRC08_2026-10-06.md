# NorAutoMatch R2 Broad Release-Candidate Fresh Re-Challenger FAIL after BRC-FRC-08

Date: 2026-10-06

## Bound candidate

Repository: `norrijam405/NorAutoMatch`

Exact frozen successor:
`e7463084182089c2cbc0b3fe8732f8b38e5d8966`

Tree:
`feff684ae62017b6fa5843e9af9c295a3c2ea679`

Failed predecessor:
`41d3042b41e685b1f384a78a1840bdba77bc762e`

Role: separate Broad Release-Candidate Fresh Re-Challenger.

No remediation, merge, deploy, production activation, live traffic, provider execution, or outbound customer communication was performed.

## Required BRC-FRC-08 first check

The exact candidate's real `npm start` launcher includes:
- `infrastructure/norautomatch-conversation-ownership-r0.sql`
- `infrastructure/norautomatch-conversation-communication-ledger-r0.sql`
- `infrastructure/norautomatch-site-chat-thread-r0.sql`

The migration runner transactionally records every applied migration in `norautomatch_schema_migrations` with a SHA-256 checksum and rejects checksum drift on later startup.

Preserved exact-head workflow `37548982937` is SUCCESS for exact head `e7463084182089c2cbc0b3fe8732f8b38e5d8966` / tree `feff684ae62017b6fa5843e9af9c295a3c2ea679`.

That exact-head production-bootstrap workflow runs the real migration-only `npm start` path, verifies production v13 + communication/site-chat guards, runs startup a second time for checksum/idempotency, runs secure-document binding regression, communication truth regression, and the same-site ownership/expiry regression on the production-bootstrapped database, then runs full typecheck and production build.

The exact candidate source contains:
- `crm_site_chat_access`
- `crm_site_chat_replies`
- deferred constraint trigger `crm_site_chat_reply_access_commit_guard`
- function `norauto_enforce_site_chat_reply_access_at_commit()`

BRC-FRC-08 is therefore re-established as closed for the challenged exact candidate.

## BRC-FRC-07 through BRC-FRC-01 regression state

The FRC-08 successor is 3 commits ahead / 0 behind failed predecessor `41d3042...`, and changes only:
- the BRC production-bootstrap workflow,
- `scripts/start-production.mjs`,
- `scripts/verify-production-communication-ledger.mjs`.

The exact-head BRC-FRC-08 workflow also re-executes the production-bootstrapped communication truth and secure-document binding regressions. The previously repaired communication insert-truth + immutability protections and customer/opportunity binding surfaces are not weakened by the three-commit FRC-08 delta.

No regression in BRC-FRC-07 through BRC-FRC-01 was found before the first new material finding below.

## First new material finding

**NORAUTOMATCH-R2-BRC-FRC-09 — SITE_CHAT_REPLY_OWNERSHIP_AND_EVENT_TRUTH_CAN_BE_FORGED_BY_DIRECT_SQL_INSERT**

### Expected invariant

A durable customer-visible same-site reply must not be publishable unless:
- its source conversation event is eligible and not DEAD_LETTER or REDACTED;
- the publisher is the current ASSIGNED conversation owner;
- the same-site access row remains present and unexpired through COMMIT.

These are broad-release invariants, not merely application-route conventions. A direct database write must not be able to mint customer-visible publication truth while bypassing current-owner or source-event eligibility.

### Exact-source reproduction

On exact candidate `e7463084...`:

1. `src/lib/site-chat-thread.ts::publishSiteChatReply()` correctly checks:
   - provider is `NORAUTO_SITE_CHAT`;
   - source event exists and is not DEAD_LETTER/REDACTED;
   - current assignment is ASSIGNED to `publishedBy`;
   - site-chat access is active;
   then inserts into `crm_site_chat_replies`.

2. `infrastructure/norautomatch-site-chat-thread-r0.sql` does **not** enforce the source-event or current-owner checks at the database insertion boundary.
   - `source_event_id` is plain text with no FK or validating trigger.
   - `published_by` is plain text with no ownership-validation trigger.
   - there is no trigger binding a reply to an eligible `crm_conversation_events` row.
   - there is no trigger binding `published_by` to the current ASSIGNED `crm_conversation_assignments` row.

3. The only deferred INSERT guard is `crm_site_chat_reply_access_commit_guard`, which calls `norauto_enforce_site_chat_reply_access_at_commit()`. That function checks only that a matching `crm_site_chat_access` row exists and remains unexpired at commit.

4. Therefore, whenever an active site-chat access row exists, a direct SQL insert shaped like:

```sql
insert into crm_site_chat_replies (
  workspace_id,
  conversation_id,
  source_event_id,
  body,
  published_by
) values (
  '<workspace with active access>',
  '<conversation with active access>',
  'arbitrary-or-dead-letter-event-id',
  'forged customer-visible reply',
  'non-owner-subject'
);
```

can satisfy the table CHECK constraints and the deferred access guard without proving source-event eligibility or current ownership.

5. `readSiteChatReplies()` subsequently selects every `delivery_state='PUBLISHED'` row for the authorized workspace/conversation and returns its body to the customer thread. It does not revalidate source-event eligibility or publisher ownership on read.

### Material impact

A database principal capable of inserting through the application's production database role can mint a durable customer-visible same-site reply that:
- is attributed to a non-owner;
- references an arbitrary/nonexistent or otherwise ineligible source-event id;
- bypasses the application's DEAD_LETTER/REDACTED publication rejection;
- is returned by the customer-facing same-site thread reader as a valid published reply.

This violates the broad mandatory themes covering current-owner-only publication, dead-letter/redacted-event fail-closed behavior, and durable communication/publication truth.

The finding is materially analogous to BRC-FRC-05: application-level truth checks exist, but the database insertion boundary can mint durable customer-visible evidence/publication state without those checks.

### Attribution

The defect is present in the exact frozen candidate. BRC-FRC-08 adds the site-chat schema to the real production startup path, which makes this database insertion surface part of a fresh production bootstrap. The defect is not introduced by a moving branch substitution.

## Challenge environment / limitation

This Fresh Re-Challenger had authenticated GitHub source and workflow evidence access but no independent PostgreSQL server in the local execution environment. The finding does not depend on an unobserved runtime race: it follows directly from the exact table constraints, the exact deferred trigger function, the application insert path, and the customer-facing read query.

The exact-head PostgreSQL 17 builder run is corroborating evidence for BRC-FRC-08 closure only; it does not test this direct-SQL ownership/event-truth bypass.

## Disposition

**BROAD_RELEASE_CANDIDATE_FRESH_RECHALLENGER_FAIL / REMEDIATION_REQUIRED / NO_PRODUCTION_AUTHORITY**

Stopped at the first material new finding as governed.

No remediation was performed in this role.
