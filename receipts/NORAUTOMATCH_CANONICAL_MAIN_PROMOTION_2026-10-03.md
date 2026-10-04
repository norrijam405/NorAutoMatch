# NorAutoMatch Canonical Main Promotion Receipt — 2026-10-03

## Promotion
Legacy Render auto-deploy was independently verified OFF before canonical promotion.

Legacy service:
- name: `NorAutoMatch`
- service id: `srv-dajgf1p5efls738rfko0`
- branch: `main`
- autoDeploy: `no`
- autoDeployTrigger: `off`

PR #37 was then marked ready and merged.

Canonical main:
- merge commit: `5eaa28a0a4874a516bca76bc651b7c0e4d4576f2`
- tree: `f3b9700146a8fc5df3b9ed2297ed590be234e752`
- parents:
  - old main: `19a8a8a4da0e4c404918a2dc59d38eb17d0d8682`
  - banked staging: `06e92afc1ad1d8eaa304ed597b90b605aad2dcdb`

The canonical-main tree exactly matches the already validated and live R1 tree.

## Legacy service side-effect check
After the main merge, the old main-connected Render service still showed only its historical failed initial deployment:
- deploy: `dep-dajgf215efls738rflc0`
- source commit: `19a8a8a4da0e4c404918a2dc59d38eb17d0d8682`

No new deployment was triggered by the main promotion.

## Current live service
Governed live service:
- name: `norautomatch-live`
- service id: `srv-dakr4qlbedkc73c75pi0`
- branch: `feature/2026-09-15-supabase-auth-r1`
- autoDeploy: off
- latest live deploy: `dep-db0plutg1s2s73f5eq9g`
- deployed commit: `a28f3d341d31747a44ba03f145845b2b0bdf90bc`
- deployed tree: `f3b9700146a8fc5df3b9ed2297ed590be234e752`

Therefore live runtime bytes and canonical-main bytes are aligned by exact Git tree identity.

## Post-main smoke attempt
A fresh Render-hosted outside-in smoke was run after main promotion:
- smoke deploy: `dep-db0r6b1srm7s738r97og`

The smoke runner itself built and deployed successfully, but every request to the live service received HTTP 429 at the Render edge. The result is therefore NOT recorded as an application smoke PASS or FAIL.

This does not invalidate the earlier same-tree fresh outside-in PASS because:
- canonical main tree is byte-identical to the previously smoke-tested tree
- live service remains on that exact same tree
- no application code changed during canonical promotion
- the post-main result was edge throttling, not an observed application assertion failure

## Banked closure evidence
PASS / CLOSED:
- mailbox/account confirmation human gate
- Garage persistence human gate
- dedicated NorAutoMatch Supabase cutover
- RLS/server-only CRM lockdown
- mutable CRM function search-path hardening
- expiring Render Postgres backup and inspection
- migration of the only five synthetic CRM evidence rows
- Next.js 16.3.8 production build
- exact committed package-lock alignment
- production dependency audit: 0 vulnerabilities
- R1 staging promotion
- canonical main promotion
- legacy main auto-deploy neutralized
- V1.1 PRs #32-#36 kept separate from R1

## Open debt
1. Render live start command still uses `npx next start` while Next standalone output recommends `node .next/standalone/server.js`. Runtime is healthy, but launcher normalization remains open.
2. Full development-toolchain audit retains an unpatched advisory chain rooted in `braces@3.0.3`; production dependency audit is clean.
3. Durable provider-neutral inventory cache activation remains post-R1; R1 currently uses the verified-live provider fallback.
4. Post-main Render-to-Render smoke was edge-throttled with HTTP 429 and is not counted as a new pass.

## Final disposition
**CONDITIONALLY_PRODUCTION_READY**

Canonical source promotion is complete and production runtime is aligned to the exact canonical tree. Remaining conditions are operational hardening / tooling debt rather than missing customer-auth, data-preservation, canonical-source, or live-runtime implementation.

Authority effect: NONE.
