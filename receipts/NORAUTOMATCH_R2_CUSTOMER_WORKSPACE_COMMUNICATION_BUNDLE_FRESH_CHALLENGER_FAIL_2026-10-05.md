# NorAutoMatch R2 Customer Workspace + Communication Bundle — Fresh Challenger FAIL

Date: 2026-10-05

Repository: `norrijam405/NorAutoMatch`

Draft PR: #55

Fresh Challenger role: separate adversarial challenger. No remediation performed.

## Frozen candidate

- commit: `da014f6ddbf863ae8b5bd05ec3489913191cb122`
- tree: `fd0b4f4de0d325dc9aae9f154f8021c685d66a2b`
- base canonical production main: `71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`

The Git commit object for the challenged SHA resolves to the exact tree above.

## Finding

**NORAUTOMATCH-R2-FC-01 — STALE_CONVERSATION_OWNER_CAN_PUBLISH_SAME_SITE_REPLY_AFTER_OWNERSHIP_TRANSFER**

Severity/disposition: **FAIL / challenger stop boundary**

Mandatory challenge theme hit:
- conversation ownership races
- stale ownership
- non-owner mutations

## Expected invariant

A same-site Ask Torque reply mutation must only be committed by the rep who is the **current** owner of the conversation at the time of the reply insert.

If ownership changes after authorization but before the insert, the stale actor must fail closed.

## Frozen-candidate evidence

### Route-level authorization is separated from mutation

`src/app/api/manager/conversations/site-reply/route.ts`
blob: `c5faff2088be6690e2803a5899bb999102fac4b4`

The route:
1. reads the conversation event,
2. calls `requireConversationOwner(...)`,
3. then separately calls `publishSiteChatReply(...)`.

There is no enclosing transaction or ownership lock spanning those two operations.

### Ownership check is read-only

`src/lib/conversation-ownership.ts`
blob: `3e096f723a1a20ea927e1d0bca3ca2b352cdab50`

`requireConversationOwner` delegates to `readConversationOwnership`, whose query is a plain `select` without `for update` and without a transaction that remains open through reply publication.

### Reply publication does not re-check ownership

`src/lib/site-chat-thread.ts`
blob: `fb804742eea4085cd38c2da866145fcb31293196`

`publishSiteChatReply` checks:
- reply body
- provider eligibility
- source event eligibility
- active site-chat access

It then inserts into `crm_site_chat_replies`.

It does **not** read or lock `crm_conversation_assignments`, and it accepts `publishedBy` from its caller.

### Existing integration test does not cover the race

`scripts/site-chat-thread.integration.ts`
blob: `c476021df4b3540ab718c377bbaaaff44311dd9d`

The existing test validates thread registration, token collision, eligible publishing, read access, and provider rejection, but it does not transfer conversation ownership between authorization and insert.

## Reproduction

A deterministic control-flow reproduction was executed against the frozen code ordering:

1. Conversation ownership is `rep-a`.
2. `rep-a` passes `requireConversationOwner`.
3. Before `publishSiteChatReply` inserts, another transaction releases/reclaims ownership to `rep-b`.
4. `rep-a` continues into `publishSiteChatReply`.
5. The publish function does not consult ownership and accepts the insert with `published_by = rep-a`.
6. At insert time, the current owner is `rep-b`.

Observed reproduction output:

```json
{
  "candidate": "da014f6ddbf863ae8b5bd05ec3489913191cb122",
  "expectedInvariant": "only current conversation owner may publish a site reply",
  "currentOwnerAtInsert": "rep-b",
  "publishedBy": "rep-a",
  "staleOwnerMutationAccepted": true
}
```

## Why this is attributable to the frozen candidate

The challenged commit/tree is exact and immutable for this run:
- commit `da014f6ddbf863ae8b5bd05ec3489913191cb122`
- tree `fd0b4f4de0d325dc9aae9f154f8021c685d66a2b`

The source blobs listed above were fetched at that exact commit.

The defect is created by the frozen candidate's authorization/mutation ordering itself: the current-owner check and the site-reply insert are not atomic and the insert path does not revalidate ownership.

## Safety and authority

- no production deployment
- no merge
- no live customer traffic
- no outbound provider execution
- no Motive/RideMotive execution
- no secure-document upload activation
- no inventory-cache activation
- no lender submission
- no CRM terminal-state mutation
- no remediation performed

Authority effect: **NONE**

## Fresh Challenger disposition

**FAIL**

Stop at governed failure boundary.

The frozen candidate must not advance to Independent Assurance as a PASS candidate until a separate Remediation Builder produces a new frozen successor candidate and a new separate challenger is activated against it.
