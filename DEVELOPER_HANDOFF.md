# NorAuto Match — Website Developer Handoff

**Status:** Functional review build  
**Approval:** Owner reports employer/GM approval received on August 14, 2026. Retain the written approval with project records and keep implementation within its documented scope.  
**Source:** Pull request #1 from `arena/01a00129-norautomatch` into `main`

**Master specification:** `MASTER_GROWTH_SYSTEM_BUILD_PROMPT.md`

## Positioning that must survive finalization

**Brand:** NorAuto Match  
**Core promise:** “Tell me the number. I’ll find the car.”  
**Primary market:** Oklahoma City metro  
**Primary behavior:** Start with monthly payment and buying power, not a generic wall of inventory.  
**Differentiator:** One direct contact plus a regional sourcing path when the current inventory has no match.

Do not turn this into a generic dealership template. The matcher and no-match concierge route are the offer.

## Marketing implementation matrix

| Layer | Incorporated | Location / behavior |
|---|---:|---|
| Primary value proposition | Yes | Hero, homepage CTAs, metadata |
| Direct call and text conversion | Yes | Sticky header, hero, footer, local pages; `(405) 861-0061` |
| Payment-first interactive funnel | Yes | `/#matcher`; $300–$1,000 payment, $0–$15,000 down, 36/48/60/72 months |
| Reverse-amortization buying power | Yes | Assumed 7% APR with consumer-facing disclaimer |
| Swipe / pass / shortlist behavior | Yes | Interactive Matcher tab |
| Persistent dimmed inventory feed | Yes | Shows budget, filter, and pass exclusions; shortlist receives green state |
| No-match concierge trapdoor | Yes | Exact sourcing copy and “Let Me Work For You” CTA |
| Traditional shopping path | Yes | Traditional Browse tab with permanent sourcing banner |
| Dual lead routing | Yes | `Standard Retail` vs `Vehicle Sourcing` in `/api/leads` |
| Contact consent | Yes | Explicit unchecked checkbox, STOP language, privacy page |
| Service-area SEO | Yes | OKC, Yukon, Edmond, Mustang, Piedmont, Moore, Norman, Midwest City |
| Technical SEO | Yes | Per-page metadata, canonical area URLs, JSON-LD, sitemap, robots |
| Ad / SEO execution brief | Yes | `/playbook` is `noindex` and designed for internal handoff |
| Compliance framing | Yes | Availability, finance-estimate, licensed-dealership, privacy disclosures |
| Responsive/mobile design | Yes | Mobile navigation, controls, modal, cards, CTAs |
| Analytics events | Not yet | Add after IDs/platforms are selected; see event plan below |
| Live inventory integration | Not yet | Current six-vehicle dataset and AI images are representative demo content |
| Production CRM destination | Not yet | Set `CRM_WEBHOOK_URL` and test both pipelines |
| Production domain | Not yet | Set `NEXT_PUBLIC_SITE_URL`, redeploy, and connect it through the approved Orr Nissan West web/advertising structure |

## Required analytics event plan

Preserve these event names so Ads, Analytics, and CRM attribution agree:

- `matcher_started`
- `buying_power_changed`
- `vehicle_passed`
- `vehicle_shortlisted`
- `trapdoor_viewed`
- `lead_form_opened` with `pipeline`
- `lead_submitted` with `pipeline` and source/UTM values
- `phone_clicked`
- `text_clicked`
- `traditional_browse_opened`

Do not send names, email addresses, phone numbers, trade details, or other PII into Google Analytics or ad pixels.

## Production integrations

### CRM

Set `CRM_WEBHOOK_URL` to the approved Zapier, Make, n8n, HubSpot, or equivalent endpoint. Trapdoor leads carry:

```json
{
  "trigger": "trapdoor",
  "pipeline": "Vehicle Sourcing"
}
```

Normal vehicle inquiries carry:

```json
{
  "trigger": "retail",
  "pipeline": "Standard Retail"
}
```

Test a real submission into each pipeline before adding paid traffic.

### Inventory

Replace `src/lib/inventory.ts` with the approved inventory feed. Required normalized fields:

- stable vehicle/VIN identifier
- year, make, model, trim
- price
- body type
- mileage
- drivetrain
- approved photo URL
- availability status and last-updated timestamp

Do not publish stale units as live. If the feed fails, show sourcing/concierge rather than fabricated availability.

### Domain and Google presence

1. Connect the approved NorAuto Match domain.
2. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin.
3. Redeploy and verify canonical tags, sitemap, robots, and structured data.
4. Do not create a separate salesperson Google Business Profile. Google excludes corporate sales associates and lead-generation agents from individual-practitioner eligibility.
5. Connect the experience through the approved Orr Nissan West website, advertising accounts, and business presence.
6. Verify the domain in Google Search Console and submit `/sitemap.xml`.

## Final acceptance checklist

- [ ] Homepage and matcher reviewed at 390px, 768px, 1440px widths
- [ ] Swipe gestures and pass/shortlist buttons work on iOS and Android
- [ ] Empty deck and zero-filter state both show the concierge trapdoor
- [ ] Traditional Browse banner opens the Vehicle Sourcing form
- [ ] Retail inquiry opens the Standard Retail form
- [ ] Both CRM pipelines receive complete submissions
- [ ] Call and text CTAs dial/message `(405) 861-0061`
- [ ] Live inventory price and availability match the approved source
- [ ] Production analytics events fire once and contain no PII
- [ ] Privacy, consent, payment, and licensed-dealership disclosures remain visible
- [ ] `npm run lint`, `npm run typecheck`, `npm run build`, and `npm audit` pass

## Current technical validation

The review build has passed:

- ESLint
- TypeScript
- Next.js production build
- npm audit with zero known vulnerabilities
- HTTP smoke tests for homepage, Mustang service-area page, sitemap, and lead API

## Non-negotiables

1. Keep the payment-first offer above the fold.
2. Keep the trapdoor in both Interactive Matcher and Traditional Browse.
3. Keep Retail and Vehicle Sourcing routing separate.
4. Keep the direct phone/text path visible on mobile.
5. Keep financial-estimate and licensed-dealership disclosures.
6. Do not replace the experience with an iframe of the dealership inventory site.
