# Torque trained-runtime bridge R0 — isolated candidate (2026-11-06)

## Verified repository facts
- Customer-facing `/api/torque/search` currently answers via `answerTorqueInventory`, sales-spec matching, follow-up handling, and dealer-catalog source gates. This is not evidence of invoking an independently trained model.
- Existing `conversation-gateway` / `conversation-response-preparation` supply bounded response packets with evidence requirements and human-review truth states.
- A verified trained Torque runtime endpoint, authentication method, provider identity, and runtime deployment evidence have **not** been established in this engineering pass.

## Implemented in this branch
- `src/lib/torque-trained-runtime-bridge.ts` defines an **opt-in, server-side, draft-only** transport consuming the existing response-preparation packet.
- Exact approved HTTPS origin required, bearer credential injected by a server-side caller, five-second timeout, strict response schema, and explicit fail-closed unavailability states.
- The request includes customer-stated questions, constraints, subject references and bounded summary, **not** customer contact fields or secure-document bytes. **Free-text can itself contain personal information**; do not enable this bridge without an approved runtime/data-sharing policy and any needed minimization or redaction.
- It does not modify the customer-facing Torque route, send messages, write CRM records, claim inventory availability, book appointments, approve financing, or deploy.
- `scripts/torque-trained-runtime-bridge.behavior.ts` is a synthetic check; it requires compilation and execution before PASS may be claimed.

## Steps to activate after verification
1. Identify the actual trained Torque runtime and its approved HTTPS API contract, service ownership, and supported auth method.
2. Prove authenticated runtime health and safe data exchange in a nonproduction environment; confirm response protocol or adapt with an explicit versioned adapter.
3. Audit prompts and unstructured customer text for data minimization, source provenance, prompt injection and privacy.
4. Add a server-only integration caller and gated route; keep inventory, MatchDNA and human-approval controls authoritative.
5. Run isolated behavior and full application typecheck/build/regression tests on the exact commit; compare responses to the trained Torque evaluation cases.
6. Release only with explicit authorized production activation and measured rollback.

## Truth state
Code written to an isolated draft branch; trained runtime **NOT_CONNECTED**; exact-head tests **NOT_YET_OBSERVED**; production **NOT_CHANGED**.

## R1 deeper build batch — code staged, testing deliberately deferred
- `torque-runtime-context-gate.ts`: external-draft approval and conservative blocking of recognizable contact, financial, identity, and prompt-injection patterns. **Pattern screening is incomplete and does not guarantee de-identification**. Further privacy review and verified processor agreement are mandatory.
- `torque-response-review.ts`: classifies potentially consequential vehicle availability, pricing, financing, appointment, or reservation statements for mandatory review; does not certify truth or approve outbound contact.
- `torque-conversation-action-plan.ts`: deterministic suggestions for exact-match review, must-have verification, or human network sourcing. Does not make CRM writes.
- `torque-trained-runtime-bridge.ts` now requires explicit per-call external-runtime approval, invokes the context gate, and attaches a human-review result to draft responses. Existing search route remains untouched.
- Synthetic behavior script extended for approval and personal-contact blocking; **not executed yet**, in accordance with the requested deeper build-before-test sequence.

## Future work before first test batch
1. Bind a verified runtime identity and versioned adapter only after provider and data handling are authorized.
2. Add exact VIN provenance and confidence arbitration to the draft-review handoff; never promote a generated answer to dealer evidence.
3. Expand regression fixtures for customer corrections, contradictory constraints, missing equipment evidence, two-VIN Garage Battle, stale catalog, no-match sourcing, and PII leakage.
4. Batch-review code and privacy, then run typecheck, behavior suite, and build on exact SHA; check CI status before promoting.

## R2 visible customer-experience batch — staged, not deployed
- Existing `/api/torque/search` now includes `nextAction` from the deterministic action planner for regular inventory-answer flows. No model-generated claim can overwrite the classification.
- `src/components/torque/torque-chat.tsx` now displays quick-start shopping prompts and a recommended-next-step card including what the customer may ask next.
- The suggestions only populate the input. They do not auto-send messages or create sourcing requests, appointments, reservations, or sales activities.
- The card is shown only when the response includes a verified planner object. Clarification and battle reply paths may not have a next-action card.
- All new UI is on the draft engineering branch; customers cannot see it on the existing public deployment until a reviewed deployment is made.
- Regression test batch to include: representative inventory vs verified catalog distinctions; next-action selection after near/exact/no-match; the chat follow-up card; review flags; missing trained runtime; and customer prompt injection.

## R3 VIN explanation and preference correction batch (2026-11-06)
- Added `src/lib/torque-vehicle-evidence.ts`: a bounded evidence packet constructed strictly from a ranked matched vehicle's checked catalog record. It distinguishes demo identifiers from valid VINs, reports stock number/listed price/equipment where present, treats unverified mileage as unknown, and explicitly lists availability/seating/equipment/pricing gaps. Dealer listing contents are *reported*, not independently certified.
- Regular `/api/torque/search` responses now include VIN-scoped `vehicleEvidence` for up to three ranked results. No source fields are manufactured.
- The customer chat shows an expandable **Why this vehicle? · View listing evidence** panel with recorded details and confirmation gaps. This is staged on the development branch only.
- `torque-conversation-state.ts` supports explicit withdrawals of selected equipment requirements (heated seats, sunroof, third row, panoramic roof) while retaining unrelated customer requirements. A customer must state each withdrawal explicitly; multi-item shorthand is not yet fully interpreted.
- Added `scripts/torque-evidence-and-corrections.behavior.ts` as a synthetic regression fixture. It has **not been executed**. Existing build/CI and route behavior remain unverified.
- This R3 batch does not connect the independently trained Torque model, activate external processing, create CRM actions, or deploy.

### Test gate after planned build batch
Confirm correct TypeScript compilation, VIN evidence association, sample/catalog labeling, no false zero-mileage claim, explicit customer corrections, near-match gaps, and behavior across chat resets. Review privacy/minimization before any trained-agent runtime is enabled.
