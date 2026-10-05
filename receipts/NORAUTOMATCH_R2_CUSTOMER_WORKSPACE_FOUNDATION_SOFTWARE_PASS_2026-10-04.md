# NorAutoMatch R2 Customer Workspace Foundation Software PASS — 2026-10-04

## Candidate

PR #40 — R2 customer workspace foundation — Torque bridge, secure docs, video hub

- branch: `feature/2026-10-04-customer-workspace-foundation-r0`
- exact head: `bc5e24065d4ede51f5b38abbb94a02f9249aa3e7`
- base: canonical `main` `71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`
- mergeable: yes
- state: DRAFT

## Reconciliation performed before build

Current GitHub and preserved NorAutoMatch materials were reconciled first.

Existing capability deliberately reused:
- CRM lead/opportunity intake
- `NORAUTO_DESK_PREP_V1`
- manager handoff/review
- conversation gateway/persistence
- response preparation/evidence requirements
- manager conversation desk
- Torque Green Room + independent assurance
- Supabase auth/membership boundary

No second CRM, second desk-prep system, second manager queue, or second agent framework was created.

## New bounded foundation

### Orr Conversation Bridge Contract

`src/lib/orr-conversation-bridge.ts`

Normalizes an authorized Orr/RideMotive provider event into the existing `IGNIAQUA_CONVERSATION_EVENT_V1` shape.

Hard boundaries:
- dealer id 2175
- dealer domain `orrnissanwest.com`
- authority effect NONE
- no endpoint automation or live provider calls in this candidate

### Secure Customer Document Contract

`src/lib/customer-secure-document.ts`

Defines receipt/status metadata for:
- trade offer
- driver license
- insurance
- payoff statement
- proof of residence
- deal stipulation
- other

Agent-facing status deliberately excludes:
- raw bytes
- storage reference
- original filename

No SSN/bank credential collection, lender submission, or credit-pull authority exists.

### Video Hub Contract

`src/lib/video-hub.ts`

Defines canonical video metadata and external channel publication truth.

Outbound social publishing authority remains `NOT_GRANTED`.

## Verification

Workflow:
- `NorAutoMatch Customer Workspace Foundation CI`
- run: `37250077366`
- result: **SUCCESS**

Passed:
- production dependency security gate
- secure-document metadata boundary challenge
- Orr conversation normalization challenge
- video publication truth challenge
- full application TypeScript
- production build

## Orr/ChatAgents discovery

A separate NorAutoMatch issue was created for supported vendor integration discovery:

`#41 — Orr ChatAgents / RideMotive official integration discovery for Torque`

The founder-supplied HAR establishes observable interface shape but is not treated as authority to automate undocumented endpoints.

## Disposition

**SOFTWARE_FOUNDATION_PASS / NO_LIVE_CUSTOMER_ACTIVATION / AUTHORITY_NONE**

Remaining lanes are independently governed:
- secure storage architecture + retention/access policy
- supported Orr/ChatAgents webhook/API authorization
- customer-facing Torque runtime
- video persistence/management UI and optional social publishing connectors
- independent challenge/assurance

