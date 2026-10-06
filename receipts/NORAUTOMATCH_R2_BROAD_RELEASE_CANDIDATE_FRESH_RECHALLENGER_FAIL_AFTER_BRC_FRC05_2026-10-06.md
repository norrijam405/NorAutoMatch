# NorAutoMatch R2 Broad Release-Candidate Fresh Re-Challenger FAIL after BRC-FRC-05

Role: new separate Broad Release-Candidate Fresh Re-Challenger.

Repository: `norrijam405/NorAutoMatch`.

Exact frozen successor challenged:
`1f23d99b9142051ecdb3aa6b5aac6e92f2371ac6`

Exact tree:
`485464c7e187aa5da13a121c5165fc9927dcb5ab`

Failed predecessor:
`56cb460fbe0f3f4f09649fa5ce7d430fc3db9b26`

## Required repaired witness first

BRC-FRC-05's preserved repaired witnesses are closed on the exact frozen candidate.

Exact-head workflow:
`NorAutoMatch R2 Communication Ledger CI`
run `37481434967` — **SUCCESS**.

The run is bound to head `1f23d99b9142051ecdb3aa6b5aac6e92f2371ac6` and tree `485464c7e187aa5da13a121c5165fc9927dcb5ab`.

The frozen integration surface proves:
- direct SQL delivery evidence with an invalid/arbitrary source event is rejected;
- direct SQL delivery evidence without matching prior outbound execution is rejected;
- the normal governed execution/delivery path still works;
- direct SQL UPDATE, DELETE, and TRUNCATE remain rejected;
- committed communication evidence survives unchanged.

## Prior broad regressions

BRC-FRC-04 and BRC-FRC-03 remain covered by the exact-head communication-ledger run above: UPDATE, DELETE, and TRUNCATE are rejected and committed evidence survives unchanged.

BRC-FRC-02 and BRC-FRC-01 remain unchanged by the FRC-05 successor delta. Direct comparison from predecessor `56cb460fbe0f3f4f09649fa5ce7d430fc3db9b26` to this successor is 4 commits ahead / 0 behind and changes only:
- `.github/workflows/norautomatch-r2-communication-ledger-ci.yml`;
- `infrastructure/norautomatch-conversation-communication-ledger-r0.sql`;
- `scripts/conversation-communication-ledger.integration.ts`.

The startup-v13 and secure-document/opportunity-binding surfaces are therefore unchanged from their previously passing exact predecessor state.

## First new material finding

**NORAUTOMATCH-R2-BRC-FRC-06 — ARBITRARY_PROVIDER_RECEIPT_REFERENCE_CAN_MINT_DELIVERY_AFTER_VALID_EXECUTION**

The BRC-FRC-05 remediation validates source-event provenance, current ownership, consent, preferred channel, and the existence of a prior matching `OUTBOUND_EXECUTION_RECORDED` row. It does not bind `DELIVERY_EVIDENCE_RECORDED` to an authentic provider receipt.

Once a legitimate outbound-execution row exists for the same workspace/provider/conversation/source/channel/actor/target hash, the insert trigger accepts any non-null `evidence_ref` supplied with:
- `event_type='DELIVERY_EVIDENCE_RECORDED'`;
- `evidence_authority='PROVIDER_RECEIPT_REPORTED_BY_REP'`;
- `delivery_outcome='DELIVERED'`.

Neither the table constraint nor `norautomatch_enforce_communication_evidence_insert_truth()` verifies the receipt reference against a provider-controlled event, provider callback, receipt table, signature, immutable provider message identifier, or other independently grounded delivery evidence.

The governed application path has the same gap: `normalizeEvidenceRef()` only trims the supplied string and checks that it is non-empty and at most 512 characters. After a valid execution row exists, a caller can submit an arbitrary string such as `fabricated-provider-delivery-receipt` with `deliveryOutcome: 'DELIVERED'`, and the database trigger has no authenticity predicate that rejects it.

A representative direct-SQL witness after a valid prior execution is structurally equivalent to:

```sql
insert into crm_conversation_contact_events (
  client_action_id,
  workspace_id,
  provider,
  conversation_id,
  source_event_id,
  channel,
  event_type,
  actor_subject_id,
  target_hash,
  target_hint,
  evidence_authority,
  evidence_ref,
  delivery_outcome
) values (
  gen_random_uuid(),
  '<valid-workspace>',
  '<valid-provider>',
  '<valid-conversation>',
  '<valid-source-event>',
  'EMAIL',
  'DELIVERY_EVIDENCE_RECORDED',
  '<current-owner>',
  '<same-target-hash-as-prior-execution>',
  '***@example.com',
  'PROVIDER_RECEIPT_REPORTED_BY_REP',
  'fabricated-provider-delivery-receipt',
  'DELIVERED'
);
```

With a matching prior outbound execution row, all current trigger predicates are satisfied and no predicate inspects the truth of the receipt reference.

The frozen `readCommunicationHistory()` implementation then maps any such row with `delivery_outcome='DELIVERED'` to `DELIVERY_EVIDENCE_RECORDED_DELIVERED`.

This is materially distinct from BRC-FRC-05's repaired witnesses. BRC-FRC-05 now blocks nonexistent source events and delivery rows lacking prior execution; BRC-FRC-06 shows that a valid prior execution can still be upgraded into false durable delivery evidence by supplying an arbitrary receipt string.

## Disposition

**BROAD_RELEASE_CANDIDATE_FRESH_RECHALLENGER_FAIL / REMEDIATION_REQUIRED / NO_PRODUCTION_AUTHORITY**

Stopped at the first material new finding as governed.

No remediation, merge, deploy, activation, live traffic, provider execution, or outbound communication was performed.
