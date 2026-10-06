# NorAutoMatch R2 Broad Release-Candidate Fresh Re-Challenger FAIL after BRC-FRC-04

Role: new separate Broad Release-Candidate Fresh Re-Challenger.

Repository: `norrijam405/NorAutoMatch`.

Exact frozen successor challenged:
`56cb460fbe0f3f4f09649fa5ce7d430fc3db9b26`

Exact tree:
`aa22c0342930ecaf5f133c11d7a8222d73b517c4`

Failed predecessor:
`b3cc4b6259c2f96c50bfb05817010fad5b0aacd7`

## Required repaired witness first

BRC-FRC-04 is closed on the exact frozen candidate.

Exact-head workflow:
`NorAutoMatch R2 Communication Ledger CI`
run `37449981312` — **SUCCESS**

The run is bound to head `56cb460fbe0f3f4f09649fa5ce7d430fc3db9b26` and tree `aa22c0342930ecaf5f133c11d7a8222d73b517c4`.

The frozen integration surface proves:
- direct SQL `UPDATE` is rejected;
- direct SQL `DELETE` is rejected;
- direct SQL `TRUNCATE` is rejected;
- committed communication evidence survives unchanged;
- normal append-only inserts and history reads still work.

## Prior broad regressions

BRC-FRC-03, BRC-FRC-02, and BRC-FRC-01 remain unchanged by the FRC-04 successor delta.

Direct comparison from predecessor `b3cc4b6259c2f96c50bfb05817010fad5b0aacd7` to this successor is 3 commits ahead / 0 behind and changes only:
- `.github/workflows/norautomatch-r2-communication-ledger-ci.yml`;
- `infrastructure/norautomatch-conversation-communication-ledger-r0.sql`;
- `scripts/conversation-communication-ledger.integration.ts`.

The startup-v13 and secure-document/opportunity-binding surfaces are unchanged from the exact predecessor state that passed BRC-FRC-02 and BRC-FRC-01, while the FRC-04 delta strictly adds the TRUNCATE rejection trigger and its witness.

## First new material finding

**NORAUTOMATCH-R2-BRC-FRC-05 — COMMUNICATION_DELIVERY_EVIDENCE_CAN_BE_FORGED_BY_DIRECT_SQL_INSERT**

The database immutability controls protect rows only after they exist. The frozen schema accepts a direct `INSERT` into `crm_conversation_contact_events` that claims:

- `event_type='DELIVERY_EVIDENCE_RECORDED'`;
- `evidence_authority='PROVIDER_RECEIPT_REPORTED_BY_REP'`;
- arbitrary non-null `evidence_ref`;
- `delivery_outcome='DELIVERED'`;
- arbitrary workspace/provider/conversation/source identifiers;
- any syntactically valid target hash and hint.

There is no database foreign key or trigger requiring the referenced source event to exist, no database coupling to current conversation ownership, no database proof of communication consent or preferred-contact eligibility, no requirement for a prior `OUTBOUND_EXECUTION_RECORDED` event, and no provider-receipt authenticity binding.

A representative direct-SQL witness that satisfies the frozen table constraints is structurally equivalent to:

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
  'forged-workspace',
  'NORAUTO_SITE_CHAT',
  'forged-conversation',
  'nonexistent-source-event',
  'EMAIL',
  'DELIVERY_EVIDENCE_RECORDED',
  'forged-rep',
  repeat('a', 64),
  '***@example.com',
  'PROVIDER_RECEIPT_REPORTED_BY_REP',
  'fabricated-provider-receipt',
  'DELIVERED'
);
```

The frozen schema has no constraint that rejects this shape.

The frozen `readCommunicationHistory()` implementation then treats any matching row with `event_type='DELIVERY_EVIDENCE_RECORDED'` and `delivery_outcome='DELIVERED'` as `DELIVERY_EVIDENCE_RECORDED_DELIVERED`. Therefore a database writer can mint durable-looking delivery evidence without the application eligibility/provenance path ever running.

This is materially distinct from BRC-FRC-03 and BRC-FRC-04: those findings concerned erasing or rewriting committed evidence. BRC-FRC-05 concerns fabrication of false evidence at insertion time.

## Disposition

**BROAD_RELEASE_CANDIDATE_FRESH_RECHALLENGER_FAIL / REMEDIATION_REQUIRED / NO_PRODUCTION_AUTHORITY**

Stopped at the first material new finding as governed.

No remediation, merge, deploy, activation, live traffic, provider execution, or outbound communication was performed.
