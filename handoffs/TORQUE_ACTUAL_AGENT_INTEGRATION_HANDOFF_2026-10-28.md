# Torque Actual-Agent Integration Handoff — 2026-10-28

## Purpose

Package the manual Torque training history into NorAutoMatch so the actual Torque agent can inherit it without relying on chat memory.

## Branch

`integration/2026-10-28-torque-agent-pack-r0`

Base at creation:

`71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`

## Added

- `workers/torque/README.md`
- `workers/torque/worker-manifest.json`
- `workers/torque/AUTHORITY_AND_TRUTH.md`
- `workers/torque/TRAINING_RECORD.md`
- `workers/torque/SALES_BDC_PLAYBOOK.md`
- `workers/torque/NORAUTOMATCH_INTEGRATION.md`
- `workers/torque/SCENARIO_SCORECARD.md`

## Intent

This is not a production-runtime activation.

It is the canonical worker identity/training/authority pack.

The actual NorAutoMatch agent should review it, evaluate Torque, assign bounded work, and only merge/adopt it if it matches current product doctrine.

## Important training lessons banked

- confirm once, then advance;
- time kills deals;
- answer direct product questions directly;
- do not judge affordability from a payment target;
- keep tone conversational and nicer, not overly forward;
- use light humor;
- preserve evidence;
- do not claim appointments, availability or physical checks that did not occur;
- escalate immediately when a customer asks for a human;
- bilingual support is fine, authority rules remain unchanged;
- service-advisor scope is basic first response, not deep diagnosis.

## Current authority

`MANUAL_SHADOW`

Customer Contact: OFF

Production Writes: OFF

Autonomous Runtime: NOT PROVEN

## Recommended NorAutoMatch-agent action

1. Review this branch.
2. Compare with current NorAutoMatch worker/runtime design.
3. Evaluate Torque with one bounded real assignment.
4. Bank the result in `workers/torque/TRAINING_RECORD.md`.
5. Decide whether to merge the worker pack.

Norris is not required for ordinary review/evaluation.

Norris is required for authority expansion, live customer contact, credentials, production configuration, destructive actions or irreversible changes.
