# NorAutoMatch — Original Roadmap + MWMM Cooperative Milestone
**Combined execution register · R14 · 2026-11-10**

This is ONE NorAutoMatch customer-sales roadmap, not a second Watchtower or a second marketing product.

## Product boundaries
- **MWMM owns discovery:** creative production, video, storytelling, campaigns, SEO, audience development.
- **NAM owns shopping decisions:** natural-language search, dealer catalog references, VIN Evidence Passport, MPG/model research, Garage Battle, shortlists, saving a no-match sale.
- **Licensed selling dealership / authorized salesperson owns transaction:** verified availability, appointments, pricing, financing and contracts.
- **IgniAqua can audit handshakes and evidence** only when separately connected and verified. This register is not proof of a running agent.

## Original roadmap: delivery gates

| Order | Milestone | Current evidence | Next gate |
|---|---|---|---|
| 1 | No-login natural-language discovery | `/find-my-car` and Torque workspace exist; R14 isolated preview uses same gated public Orr catalog; VIN links preserve direct research context | Live browser test: exact question, price/mileage and showroom inventory coverage |
| 2 | Evidence-backed Vehicle Scout | R11/R12 listing description, exact-VIN detail and EPA model research; includes source scopes and unknowns | Prove actual Orr detail MPG through live request, confirm strict VIN/page identity and stale checks |
| 3 | Garage Battle | Exact-VIN guarded candidate pairing exists on draft branch | End-to-end two live source VINs + pricing, MPG, seating/trim evidence tests |
| 4 | Save the Sale / sourcing | Existing lead modal is consent-gated; R14 adds manual copy of source-scoped shopping brief with no auto-submission | Human acceptance test with non-PII fictional scenario, then permitted CRM readback if approved |
| 5 | One shopper → one accountable salesperson | Direct contact and lead routing already exist | Verify real response workflow and store-specific authority; do not claim appointments sent without receipts |
| 6 | Production readiness | Draft PR #80 and free Render preview, production untouched | Security, privacy, accessibility, production-grade feed, real-stock pricing and live human signoff |

## Parallel MWMM cooperation track

| Stage | MWMM action | NAM action | Status |
|---|---|---|---|
| Watch → Shop | Publish an approved vehicle video and optional public VIN link | `/from/mwmm` acknowledges MWMM; validated VIN deep-link to Torque, no auto-send | NAM landing exists in preview; MWMM link not yet installed |
| Shop → Decide | Creative shows the vehicle and context | `/find-my-car` shortlists and sends exact VIN to Torque for source/equipment questions | R14 on draft; must validate real customer flow |
| Decide → Human | MWMM does not solicit a duplicate lead | NAM offers manual brief or existing explicitly consented sourcing workflow | Draft preview; real conversion not independently verified |
| Learn → Improve | MWMM may review aggregate content themes | NAM may share *consented, aggregate* themes only after privacy and attribution design | NOT CONNECTED; no tracking, customer data cross-posting or analytics invented |

## Operating constraints
- No launch without independently verifying live results; GitHub build success is not a customer experience receipt.
- No invented EPA number, leather equipment, vehicle availability, market-wide inventory, transfer time or dealer authority.
- No public advertising of sample inventory or unapproved pricing.
- No MWMM media scraping, cloned campaign pages, competing SEO funnel, automatic lead sync or copied customer information.
- Preserve free-tier isolation and `autoDeploy=no`; no production merges or paid services without approval.

## R14 implementation tracking
- `src/lib/torque-shopping-brief.ts`: deterministic, bounded portable human brief; sample listings never become verified VINs.
- `src/components/torque/torque-chat.tsx`: customer-initiated copy action, not a send.
- `src/app/find-my-car/page.tsx`: preview-only real public catalog parity with Torque; direct VIN continuation to research.
- `scripts/torque-knowledge-scout.behavior.ts`: automated brief/scope verification.
- `/from/mwmm`: existing non-indexable bridge; remains separate from MWMM's production site.

## Customer test scripts
A. Ask: “midsize SUV good on gas under $32,000 with leather.” Inspect both actual VIN references and unknown leather/MPG; verify preserved price cap.
B. Ask: “2025 Nissan Rogue MPG versus 2025 Toyota RAV4.” Compare EPA model research separately from exact VIN listing.
C. From `/find-my-car`, choose source-backed VIN → Ask Torque → copy human brief; confirm customer approval is required for any lead send.
D. Open `/from/mwmm?vin=<example>` with a **fictional valid-format VIN**; test it prefills but does not auto-send; MWMM marketing content remains elsewhere.

**Overall state: candidate development, not production or live cross-app handshake.**
