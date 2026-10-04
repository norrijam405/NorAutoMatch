# NorAutoMatch R1 Staging Promotion and Main Gate Receipt — 2026-10-03

## R1 staging promotion
PR #30 was promoted into canonical staging after the final exact candidate was frozen, built, deployed, and smoke-tested.

- source candidate: `a28f3d341d31747a44ba03f145845b2b0bdf90bc`
- candidate tree: `f3b9700146a8fc5df3b9ed2297ed590be234e752`
- PR #30: MERGED
- staging merge commit: `06e92afc1ad1d8eaa304ed597b90b605aad2dcdb`
- target: `reactivation/2026-09-08`

This promotion does not change the previously recorded runtime boundaries:
- production dependency audit is clean
- dev-toolchain advisory remains open
- Render standalone launcher normalization remains open
- durable inventory cache activation remains post-R1
- V1.1 PRs #32-#36 remain separately governed

## Canonical main promotion gate
A dedicated main-promotion pull request was opened:

- PR #37 — Promote banked NorAutoMatch R1 to canonical main
- head: `reactivation/2026-09-08`
- head SHA: `06e92afc1ad1d8eaa304ed597b90b605aad2dcdb`
- base: `main`
- base SHA: `19a8a8a4da0e4c404918a2dc59d38eb17d0d8682`
- compare: 836 commits ahead, 0 behind
- changed files: 348
- GitHub mergeability: mergeable; mergeable_state `unstable`
- state: DRAFT

## Why PR #37 is intentionally not merged yet
An existing legacy Render service:
- name: `NorAutoMatch`
- service id: `srv-dajgf1p5efls738rfko0`
- URL: `https://norautomatch-breg.onrender.com`
- branch: `main`
- autoDeploy: enabled

Merging PR #37 would therefore trigger an automatic deployment of this older main-connected Render service in addition to the separately governed `norautomatch-live` production service.

The currently available Render connector does not expose a safe in-place control to disable that legacy service's auto-deploy or change its deployment configuration. Therefore main promotion remains fail-closed until that duplicate-service deployment side effect is explicitly reconciled.

## Current disposition
**CONDITIONALLY_PRODUCTION_READY**

Functional production is live and verified. R1 is banked in canonical staging. Main promotion is prepared but intentionally gated by legacy Render auto-deploy and the separately documented launcher/dev-toolchain debt.

Authority effect: NONE.
