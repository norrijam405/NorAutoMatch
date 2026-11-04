# NorAutoMatch production release gate — 2026-10-24
Status: **NO-GO**. Scope: independent NorAutoMatch shopping site. No production publication authorized or executed.

## Grounded observations
- Preview project: norautomatch-watchtower-preview; latest reviewed READY commit 9cc38646889a71a8fbda204848711456f062b5ac.
- Release candidate branch remediation/2026-10-13-scout-hunt-relevance-gate was 187 commits ahead of main; not merged. Existing Preview env keys include live-mode activation, Supabase public config, and protected CRM DB URL. This does NOT prove public Production secrets/configuration.
- The public /api/inventory and /vehicles pages previously loaded demo inventory when mode was not activated; corrected on candidate branch (commits c16b8ac and 1533601). No production effect.
- Direct read-only SQL inspection of connected Supabase project peyrnfeytjgsuxqxloxt: public.inventory_vehicles **0 rows**, public.saved_vehicles **4**, public.match_dna_events **6**, public.torque_vehicle_hunts **2**. Do not infer the saved records are backed by available units. No records changed.
- Garage server code reads inventory_vehicles to resolve saved VINs. With zero rows, it cannot reliably resolve saved vehicle details. Fixing the source-to-Garage canonical inventory reconciliation is a launch blocker.
- Dealer inventory catalog uses verified public Algolia snapshot; signed-in Garage uses separate database table. Source sync / sold-status tombstones need proof.
- Previously Vercel runtime log query returned 403; therefore live incident cause unproven.
- Protected salesperson area, customer-facing no-login finder, PriceCheck, card links, MatchDNA and media local preview exist in code. No automatic image recognition.
- No evidence yet of a full recent browser E2E suite across guest/signed-in/sold-VIN paths.
- User reports intermittent public inventory failures; must treat as open incident pending independent repeated fetch evidence.

## Remediation sequence (bounded)
1. Identify authoritative inventory snapshots and update mechanism for public.inventory_vehicles. If unpopulated, build/test a read-only verification + transactional *Preview-only* inventory sync with dealer 2175 boundary, immutability/provenance, supported availability states, and only after verifying DB permissions and table contracts. Never blindly overwrite/delete live customers.
2. Prove Garage reads the same eligible inventory as public search, including sold/unavailable VIN states, and that saved items retain history without appearing for sale.
3. Exercise repeated provider fetch -> /api/inventory -> public finder -> listing -> VIN detail -> PriceCheck, guest navigation, follow-up consent, signed-in Garage and MatchDNA, both desktop and mobile. Demand reproducible logs/receipts. Fail closed with helpful direct dealer links on source outage.
4. Fix any invalid controls/navigation; ensure no forced login except persistent Garage/authorized account actions.
5. Check actual site domain ownership, HTTPS, Search Console/robots/sitemap, privacy and dealer affiliation claims, GBP authorization and phone/contact end-to-end. Avoid editing dealer-owned GBP without permission.
6. Frozen immutable candidate SHA, typecheck, lint, tests, accessibility/performance checks, production env readiness checklist. Deployment go/no-go only after proof; no direct production migration from branch.

## Changes committed in this audit
- c16b8ac: /api/inventory returns unavailable rather than demo if live not enabled.
- 1533601: /vehicles listing refuses to present demo as live vehicles.

## Safe user-facing state
Production is **not** certified. Source and garage reconciliation incomplete, no verified Production deployment, no GBP update.
