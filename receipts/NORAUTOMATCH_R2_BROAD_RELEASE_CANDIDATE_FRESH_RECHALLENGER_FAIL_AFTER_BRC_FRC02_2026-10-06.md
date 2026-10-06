# NorAutoMatch R2 Broad Release-Candidate Fresh Re-Challenger After BRC-FRC-02 Remediation — FAIL

Date: 2026-10-06

Repository: `norrijam405/NorAutoMatch`

Role: **Broad Release-Candidate Fresh Re-Challenger**

## Exact frozen candidate

- commit: `3e79e151f4851c48955ffbaf8c674958dee58bd7`
- tree: `02075215114217f7b02fa8111ac86d862f471324`
- failed predecessor: `d337f8b057631a599a30b4c55ea2d2a5afea67a6`
- canonical production base: `71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`
- direct comparison to canonical base: 171 commits ahead / 0 behind

No moving branch head was substituted for the challenged software candidate.

## Required BRC-FRC-02 re-challenge

The production startup remediation was re-tested first on the exact frozen successor.

Exact-head workflow run `37425049695` completed **SUCCESS**. Its job `112142706199` proved, in order:

1. production dependency audit passed;
2. the real production migration launcher (`npm start` with `NORAUTO_MIGRATION_ONLY=1`) completed;
3. `scripts/verify-production-v13.mjs` confirmed the governed migration ledger contains `infrastructure/norautomatch-crm-v13-customer-opportunity-bindings.sql`;
4. `crm_opportunity_customer_bindings` exists;
5. `customer_secure_document_opportunity_binding_guard` exists;
6. a second real production migration-launcher run completed checksum-clean/idempotently;
7. the cross-customer secure-document linkage challenge passed afterward;
8. exact-head typecheck and production build passed.

BRC-FRC-02 was not reproduced.

## Required BRC-FRC-01 re-challenge

The same exact-head job then executed the BRC-FRC-01 cross-customer secure-document binding challenge after production bootstrap installed v13. That challenge passed.

The exact candidate source also retains:
- application-level customer/opportunity verification before document linking;
- desk-readiness binding through `crm_opportunity_customer_bindings`;
- the v13 direct-database secure-document/opportunity binding guard.

BRC-FRC-01 was not reproduced.

## Disposition

**FAIL**

The broad challenge stopped at the first new material counterexample after the required BRC-FRC-02 and BRC-FRC-01 re-tests.

## Finding

**NORAUTOMATCH-R2-BRC-FRC-03 — COMMUNICATION_EVIDENCE_LEDGER_IS_NOT_DATABASE_APPEND_ONLY**

### Affected surfaces

- R2 rep/customer communication ledger
- durable communication execution evidence
- durable delivery-evidence history
- evidence identity / audit integrity
- direct-database bypass boundary

Mandatory broad-challenge themes affected include:
- #11 opening email/SMS/phone apps cannot become send evidence
- #12 rep execution evidence cannot become delivery evidence
- #13 delivery evidence cannot become customer-reached/contact-confirmed evidence
- #17 client-action idempotency collision cannot rewrite evidence identity
- communication-ledger truth / durable evidence integrity

### Expected invariant

The R2 communication ledger explicitly defines itself as append-only evidence.

`infrastructure/norautomatch-conversation-communication-ledger-r0.sql` states:

> Append-only evidence only.

`readCommunicationHistory()` returns:

`truthState: "APPEND_ONLY_EVIDENCE_READ_MODEL"`

Once communication evidence is committed, a direct database path must not be able to silently rewrite or erase the event identity/truth fields that the application treats as durable evidence.

### Exact-candidate evidence

The candidate introduces `crm_conversation_contact_events` in:

`infrastructure/norautomatch-conversation-communication-ledger-r0.sql`

The table has:
- a primary key;
- `unique (workspace_id, client_action_id)`;
- CHECK constraints that validate a row's shape at insert/update time.

However, the exact candidate defines **no database trigger, rule, immutable-row guard, or database-enforced append-only control** preventing:

- `UPDATE crm_conversation_contact_events ...`
- `DELETE FROM crm_conversation_contact_events ...`

The R2 application path in `src/lib/conversation-communication-ledger.ts` only inserts and reads rows, and its idempotency collision check only protects calls routed through `recordCommunicationAction()`.

A direct SQL writer can bypass that application check and mutate an already-committed event while still satisfying the table CHECK constraint, for example by changing an `OUTBOUND_EXECUTION_RECORDED` row's `evidence_ref` to another non-null reference, or by deleting the row entirely.

The repository contains no later infrastructure migration that hardens `crm_conversation_contact_events`; the exact candidate infrastructure tree contains the R0 communication-ledger schema plus CRM v1-v13 and site-chat schema, with no communication-ledger immutability migration.

### Reproduction / failure mode

Given a valid committed communication row:

```sql
UPDATE crm_conversation_contact_events
   SET evidence_ref = 'rewritten-provider-reference'
 WHERE workspace_id = '<workspace>'
   AND client_action_id = '<existing-action-uuid>';
```

The schema has no guard that rejects the mutation as an append-only violation, provided the new row still satisfies the existing CHECK constraint.

Likewise:

```sql
DELETE FROM crm_conversation_contact_events
 WHERE workspace_id = '<workspace>'
   AND client_action_id = '<existing-action-uuid>';
```

has no table-level append-only guard.

After either direct-database mutation, `readCommunicationHistory()` reads the rewritten/deleted state as the durable communication history. The original evidence identity is no longer recoverable from this ledger.

### Why this is material

The ledger is the R2 truth surface used to distinguish:
- external-app handoff from actual execution;
- execution from delivery evidence;
- delivery evidence from customer-reached state.

If committed rows can be rewritten or erased through a direct database path, the release candidate cannot claim the ledger itself is durable append-only evidence. The application-level client-action collision defense does not cover the direct database bypass.

This is especially material because the same release lineage already treats direct-database bypass as a required challenge boundary for secure-document/customer binding; communication evidence requires equivalent integrity at its durable truth layer.

### Attribution to the exact candidate

The communication ledger schema and application read/write model are new in the R2 delta from canonical production base. The direct base-to-candidate comparison shows the communication-ledger migration and associated application/tests were added after `71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`.

Therefore this finding is attributable to the challenged R2 successor rather than inherited canonical production behavior.

## Safety / authority

- no remediation performed
- no candidate code changed
- no merge
- no deployment
- no live customer traffic
- no secure-document activation
- no inventory activation
- no external provider execution
- no outbound customer communication
- no paid infrastructure
- no secret disclosure

Authority effect: **NONE**

## Final state

**BROAD_RELEASE_CANDIDATE_FRESH_RECHALLENGER_FAIL / REMEDIATION_REQUIRED / NO_PRODUCTION_AUTHORITY**

Per activation, broad challenge execution stops at this first new material finding.

A separate Remediation Builder should enforce communication-event immutability at the durable database boundary and prove direct UPDATE/DELETE bypass attempts fail before another Broad Fresh Re-Challenger resumes the remaining matrix.
