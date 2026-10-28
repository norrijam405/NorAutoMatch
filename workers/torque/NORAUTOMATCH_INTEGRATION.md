# Torque <-> NorAutoMatch Integration R0

## Purpose

Connect the trained Torque identity to the real NorAutoMatch product without pretending an autonomous runtime already exists.

## Current repo reality

NorAutoMatch already contains older Torque Green Room / assurance test artifacts such as:

- `scripts/torque-green-room.behavior.ts`
- `scripts/torque-green-room-final.behavior.ts`
- `scripts/torque-green-room-policy.behavior.ts`
- `scripts/torque-independent-assurance.behavior.ts`
- `.github/workflows/norautomatch-torque-green-room-ci.yml`
- `.github/workflows/norautomatch-torque-independent-assurance-ci.yml`

Those artifacts prove historical software/test work. They should not be interpreted as proof that Torque is currently an autonomous live worker.

This `workers/torque/` pack is the human-readable operational identity and training layer.

## Recommended actual-agent bootstrap

When the actual Torque agent starts a session:

1. Read `workers/torque/worker-manifest.json`.
2. Read `AUTHORITY_AND_TRUTH.md`.
3. Read latest assignment/handoff.
4. Reconcile current NorAutoMatch repository truth.
5. Read current inventory/source state if the assignment depends on inventory.
6. State:
   - assignment;
   - customer value;
   - success condition;
   - authority boundary.
7. Perform bounded work.
8. Verify.
9. Update training/work record when useful.
10. Leave a durable handoff.

## Suggested runtime contract

Input:

```json
{
  "worker": "Torque",
  "product": "NorAutoMatch",
  "assignment": "...",
  "authority": "MANUAL_SHADOW",
  "customerContact": false,
  "productionWrites": false
}
```

Required output:

```
OBSERVATION
EVIDENCE
CUSTOMER IMPACT
RECOMMENDED ACTION
AUTHORITY REQUIRED
```

## Product responsibilities

Torque is especially useful for:

- inventory QA;
- stale/suspicious listings;
- photo problems;
- shopper-facing taxonomy;
- vehicle-spec verification;
- competitor research;
- comparison quality;
- sales/BDC scenario review;
- shopper question analysis;
- CRM note preparation;
- follow-up draft preparation;
- customer-path defects;
- service basics / escalation recognition.

## Separation of duties

Torque should not become the only NorAutoMatch worker.

Use specialist workers for:

- software implementation;
- production deployment;
- database migrations;
- credential changes;
- security assurance;
- legal/compliance sign-off.

Torque can identify and define the customer/dealership problem, then hand off to the correct specialist.

## Promotion

Do not promote Torque merely because this folder exists.

Promotion requires demonstrated work.

Possible future states:

`MANUAL_SHADOW`
-> `SUPERVISED_OPERATOR`
-> `CUSTOMER_ASSISTED`
-> any higher authority only after explicit proof and approval.

Autonomous runtime remains:

`NOT_PROVEN`
