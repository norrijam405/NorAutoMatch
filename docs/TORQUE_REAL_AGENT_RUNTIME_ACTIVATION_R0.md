# Torque — Actual Agent Runtime Activation Contract (R0)

Status: **CONTRACT WRITTEN — LIVE RUNTIME NOT VERIFIED — NOT CUSTOMER-AUTHORIZED**

## Verified source of training
- IgniAqua repository: `norrijam405/IgniAqua-Control-Plane`
- Source branch: `green-room/2026-10-28-torque-reusable-training-r0`
- `green-room/workers/torque/worker-manifest.json`
- `green-room/workers/torque/TRAINING_RECORD_R0.md`
- `green-room/core/WORKER_CORE_R0.md`
- `green-room/professions/automotive/SALES_BDC_R0.md`
- `green-room/apps/norautomatch/TORQUE_BINDING_R0.md`

## What we verified
Current website chat sends messages to `/api/torque/search`. That API uses deterministic parsing, local stock ranking and Garage Battle comparisons. **It does not call the IgniAqua trained worker, LLM or model inference gateway.**

Training manifest marks Torque `MANUAL_SHADOW`, `autonomousRuntime: NOT_PROVEN`, and `customerContact: false`. These are not production-authorized capabilities.

## Design target
Website chat -> approved server-side Torque inference gateway -> short-term turn context and normalized customer needs -> read-only inventory evidence service -> claim/equipment/availability verifier -> customer answer OR human handoff.

The inference gateway must be a **real, configured, tested model/agent backend**, not a hardcoded simulation. It consumes:
1. Universal Green Room worker doctrine.
2. Automotive Sales / BDC profession module.
3. Torque training record (demonstrated lessons and known gaps).
4. NorAutoMatch binding.
5. Source-supported dealer inventory facts, with truth/freshness metadata.
6. Short, bounded, user-initiated conversation history.

### Required gateway request (conceptual, not deployed)
`POST /v1/agents/torque/respond` (server-to-server only, authenticated):
- request ID + bounded conversation/session ID, dealership scope
- latest user message, short previous turns (PII-minimized)
- explicit preferences vs firm requirements, customer-approved changes
- evidence objects: VIN, source, freshness, price, specs, gaps
- permitted actions: customer-answer; request-clarification; prepare-human-handoff; **never** confirm appointments/financing/vehicle holds

### Required gateway response
- `answer` (natural sales conversation)
- `intent`, `customerRequirements`, `suggestedNextStep`
- `claims[]` with verified evidence references; `unknowns[]`
- `handoffRequired` and scope
- runtime identity/version/qualification receipt and `truthState`
- explicit indication whether a real inference call occurred

## Strict activation gates
1. Resolve actual Torque worker runtime and hosting location. A training document is NOT runtime.
2. Verify supported provider integration, credentials, secure network, expected cost = $0 approved or explicit consent for spend.
3. Prove model actually loaded the training record, not a generic instruction string.
4. Prove read-only inventory lookups are VIN-scoped; refuse unverifiable stock/equipment/payment claims.
5. Run adversarial customer conversations (family of five, towing Silverado vs Rogue; seven-seat full-electric SUV; objection; Spanish; changing requirements).
6. Require independent assurance receipts and owner review before enabling customer-facing release.
7. Keep existing `/api/torque/search` as labeled limited fallback **only if the user-facing mode is clearly disclosed**; no pretending it is trained Torque.

## Blocker / current truth
The IgniAqua source branch verifies training **artifacts**, not a hosted model, endpoint, live runtime or customer-contact permission. No live API credentials or endpoint have been independently verified. **Do not flip production traffic or claim full Torque deployment** until gates pass.

## Next concrete integration task
Locate/verify IgniAqua's currently executable provider gateway and training-loader entrypoint; use a mutually authenticated connector in non-production; capture three genuine model-call receipts; then run customer-journey tests before owner-approved promotion.
