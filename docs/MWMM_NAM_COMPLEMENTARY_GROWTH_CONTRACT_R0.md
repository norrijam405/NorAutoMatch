# MWMM × NorAutoMatch — Complementary Growth & Sales Contract R0
**Status:** Draft branch implementation; not a production handshake or connected marketing integration.

## One customer journey, two distinct owners

| Stage | Owner | Deliverable | Not allowed |
|---|---|---|---|
| Attention and discovery | Mobile With Matt Mobley (MWMM) | Original video, social content, SEO, campaign creative and educational product demonstrations | Create a competing vehicle checkout, inventory authority, or independent dealer funnel |
| Fit and evidence | NorAutoMatch (NAM) / Torque | Vehicle search, budget and equipment filters, VIN-specific evidence, comparisons, near-match explanations, Garage Battle | Duplicate MWMM's media studio, claim unverifiable MPG/equipment, promise stock |
| Human transaction | Authorized selling dealership / accountable salesperson | Availability confirmation, test drive, official quote, finance processes and closing | Automatic promises, unapproved outreach, unlicensed brokerage |
| Learning loop | Shared, minimal aggregate reporting after explicit approval | Content themes vs. qualified shopping intent and verified appointments/sales | Sell data, leak identity or free-text preferences across apps, pay unauthorized referral fees |

**Operating principle:** MWMM creates *reasons to shop*. NAM creates *confidence about what to shop*. The dealership executes the sale. They are complementary, not competing storefronts.

## Implemented minimal handshake

- Non-indexable route: `/from/mwmm`. Distinct landing page credits MWMM as the content origin and NAM as the shopping utility.
- MWMM can link `/from/mwmm?vin=<valid17charvin>`; only a syntactically valid VIN reaches `/ask-torque?vin=...` where the customer gets a prefilled but **unsent** question.
- No tracking cookie, pixel, customer record, referral fee, cross-project API, CRM write, automatic appointment, or campaign attribution is introduced by this handoff.
- Source accountability: a VIN from a link is a *request to verify*, not proof of stocked inventory or vehicle equipment.

## Competitive focus

1. **VIN Evidence Passport:** list price/stock snapshot and truth labels on engine, MPG, color, trim, features, and source URL; unknown stays unknown.
2. **Compare Beyond Nissan:** combine independently sourced model research (EPA) with a separately identified dealer VIN listing. Never imply competitor availability.
3. **No-perfect-match save-the-sale:** retain nonnegotiable requirements, display verified near misses, explain tradeoffs, and propose a human search of authorized dealer networks, *without pretending to have queried those inventories*.
4. **Continuity with one salesperson:** history, consented handoff to a human, and meaningful next step; measure actual appointment/show/sale only once reliable and consent-compliant.

## Future mutually beneficial exchange (NOT ACTIVE)

MWMM → NAM: content/campaign ID, public VIN or vehicle model, origin channel, consented attribution token; never personal details without separate consent and lawful purpose.

NAM → MWMM: *aggregated* questions people ask, commonly misunderstood equipment/MPG, verified conversion results once lawful sharing and approved systems exist. No raw shopper messages, VIN-level personal behavior, or customer details by default.

Guardrails: No marketing automations without opt-in; no mass content copying; no competing SEO keyword clones; use clear Orr Nissan West dealer identity in sales communications; external retailer listings are research-only until licensed seller scope and explicit verification are established.

## Validation

Unit assertions for the URL gate and a production build. End-to-end conversion tracking requires separately approved implementation, connected accounts, and evidence-based test receipts. This document does NOT claim MWMM integrations or live leads exist.
