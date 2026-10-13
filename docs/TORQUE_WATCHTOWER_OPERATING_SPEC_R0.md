# Torque + Watchtower Operating Spec R0

## Product contract

NorAutoMatch is the customer-facing shopping experience. Torque is the conversational sales and sourcing intelligence layer. MatchDNA records customer preference signals. Vehicle Hunt is the canonical long-running search object. Watchtower is the restricted operator surface. Industry Scout supplies verified market intelligence. CRM Bridge exports bounded records to dealership systems only through verified provider adapters.

## Core flow

Customer request -> Torque Sales Inventory Spec -> Vehicle Hunt -> verified local inventory -> Orr network -> nationwide new Nissan discovery -> human verification when sourcing is required -> customer follow-up -> CRM synchronization when authorized.

## Truth hierarchy

1. Primary verified source evidence.
2. Corroborated evidence.
3. Observed but not fully verified source data.
4. Torque inference.
5. Unverified reporting.

A lower truth state must never overwrite a higher truth state.

## Customer language

Customer-facing Torque should focus on whether we can help obtain the right vehicle, not unnecessarily advertise which dealership currently holds it.

Torque must never:
- claim a vehicle is physically present when it is not;
- promise a transfer, reservation, arrival time, financing result, price exception, or trade value without the required human or dealership authority;
- silently drop a must-have requirement to manufacture a match;
- present industry rumor as customer fact.

## MatchDNA precedence

Explicit customer statements outrank MatchDNA inference.

MatchDNA may help rank or explain candidates, but it may not silently rewrite a customer hard requirement.

## Sourcing

Local verified exact match -> customer-safe direct match.

Orr Oklahoma network match -> may be represented as a network sourcing opportunity. Same-day language requires confirmed availability and confirmed transfer timing.

Other Orr network match -> verify sourcing feasibility before promising a result.

Out-of-network match -> invite customer to validate the comparable model and numbers first, then pursue dealer-to-dealer sourcing through a human/manager path.

## Vehicle Hunt

One serious vehicle request should map to one canonical Vehicle Hunt.

Vehicle Hunt should preserve:
- explicit customer request;
- normalized sales inventory spec;
- must-have versus preferred requirements;
- candidate VINs;
- source scope;
- MatchDNA context;
- sourcing state;
- contact consent;
- salesperson owner;
- customer follow-up state.

## Industry Scout

Industry Scout should monitor:
- incentives and APR/lease programs;
- model launches and refreshes;
- trim and feature changes;
- pricing and transaction-price trends;
- inventory and supply;
- sales volume and market share;
- consumer demand;
- EV/hybrid shifts;
- recalls/safety;
- competitor moves;
- regulation and ownership cost.

Customer-facing use of incentives, pricing, safety, and feature claims requires primary or corroborated evidence.

Scout output should be matched against active Vehicle Hunts. Market intelligence that affects no active customer or sourcing decision should remain informational instead of creating unnecessary follow-up.

## Follow-up

Preferred channel order: TEXT -> EMAIL.

Every follow-up must add new information, answer a customer request, or advance a clearly stated next step.

Generic repeated "just checking in" messages are not a valid follow-up reason.

Inventory events, exact-match discoveries, meaningful price changes, and verified incentive changes may create high-value follow-up opportunities.

Consent, suppression, channel authorization, and cadence controls remain authoritative.

## CRM Bridge

Torque uses one internal canonical model and provider-specific adapters.

A CRM adapter must prove:
- verified authorized contract;
- authorization evidence;
- source contract evidence;
- explicit capabilities.

No CRM adapter gains implicit write access.

## Operator surfaces

Public NorAutoMatch: simple customer experience.

Torque Watchtower: internal VIN/store/source truth, active Hunts, sourcing paths, Scout opportunities, follow-up, and manager packets.

Customer-facing language must remain cleaner than the operator surface.

## Commercial modules

- Torque Core
- Torque Hunt
- MatchDNA
- Watchtower
- Industry Scout
- Torque Follow-Up
- CRM Bridge

These modules should remain separable enough for future dealership licensing while sharing one canonical truth/evidence model.


## Migration verification

Watchtower schema changes must execute successfully against a fresh PostgreSQL test database in CI before any live-database activation decision. A green TypeScript build alone is not sufficient migration evidence.
