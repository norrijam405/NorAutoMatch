# NorAutoMatch Integrated Showcase R2 — 2026-09-15

## Truth state

- Public showcase integration: VERIFIED LIVE
- Customer-visible live inventory: VERIFIED LIVE
- Homepage live SwipeMatch hero: VERIFIED LIVE
- Exact VIN detail route: VERIFIED LIVE
- Authentication protection for signed-out users: VERIFIED LIVE
- Durable user signup/login lifecycle: NOT YET USER-LIVE VERIFIED
- Canonical merge to older production lineage: NOT CLAIMED

## Runtime

Public URL: https://norautomatch-live.onrender.com

Live application SHA:
`4ae6b1472a74396027d3e1f31d30baa9ed6d71c1`

Visual-release smoke harness SHA:
`59dce9bb46fd5fa66b5b9cc83a2392fdaa4baf4c`

## Source inventory evidence

Outside-in smoke against the public URL observed:

- source: `orr-live`
- mode: `live-enabled`
- raw active store-associated source units: 406
- normalized/customer-usable units: 399
- rejected/quarantined source rows: 7
- in-transit units included: 15
- warnings: 15
- normalization errors preserved: 7

The 406 source population uses Orr's public store-association semantics rather than the narrower primary dealer_id-only interpretation. In-transit units remain part of the customer inventory population instead of being rejected solely for transit state.

## Photo evidence

The strengthened outside-in release smoke observed:

- usable vehicles: 399
- vehicles with HTTP image: 396
- vehicles with Ridemotive CDN image: 396
- photo coverage: 0.9924812030075187 (99.248%)

Homepage assertions all passed:

- `Live SwipeMatch` present
- `Open exact VIN` present
- `Verified VIN` present
- `images.app.ridemotive.com` image present

The photo pipeline now expands source Ridemotive image IDs into `https://images.app.ridemotive.com/<image-id>` and the customer-facing SwipeMatch surfaces render those images.

## Outside-in route smoke

- `/` -> 200
- `/inventory` -> 200
- `/api/inventory` -> 200
- `/vehicles` -> 200
- `/login` -> 200
- `/account` -> 307 to login while signed out
- `/garage` -> 307 to login while signed out
- `/manager` -> 307 to login while signed out

Exact VIN smoke for `1C4BJWEG6GL118769`:

- detail route -> 200
- VIN present -> PASS
- `Source-verified VIN` label -> PASS
- `Source-provided equipment` section -> PASS
- Ridemotive image -> PASS

## Build proof

Exact live integration SHA passed the external zero-cost validator path:

- dependency resolution
- `npm ci`
- TypeScript typecheck
- Next.js 16.3.3 production build
- 28 route generation
- 0 npm vulnerabilities reported by the validator's audit at proof time

## Product integration

The homepage now connects the previously separate pieces into one customer path:

1. `Tell me the number` hero framing
2. live photo-backed SwipeMatch card in the hero
3. Pass / Keep / Next session controls
4. Open exact VIN
5. Full inventory playground
6. live search/filter/SwipeMatch/Garage Battle/finance-next-step surfaces
7. protected Account/Garage/Manager boundaries

The hero and inventory page read from the same verified catalog. They do not maintain separate inventory truth.

## Remaining open work

- Recover/enrich the 7 quarantined source rows from alternate Orr/VDP evidence where possible.
- Move transient dealer-source caching to durable Supabase inventory storage when management/API access is healthy and the purpose-specific write boundary is verified.
- Exercise real Supabase signup, email confirmation, login, logout, saved-vehicle and membership behavior with a human test account before claiming USER-LIVE auth closure.
- Bank the regenerated package lock artifact canonically.
- Reconcile the older Render `main` production service lineage separately; do not conflate that older service with this verified showcase.
- Continue mobile/visual polish and interaction persistence without weakening source truth or authorization boundaries.

## Release rule added

`norautomatch-public-smoke.mjs` now fails the release smoke if the homepage loses the live SwipeMatch hero/verified VIN/exact VIN action/Ridemotive image, or if live inventory photo coverage falls below 90%. This turns the visual inventory requirement into a persistent regression gate.
