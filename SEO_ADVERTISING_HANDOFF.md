# NorAuto Match — SEO & Advertising Handoff

**Status:** Architecture and growth handoff note  
**Prepared:** August 15, 2026  
**Source implementation:** Pull Request #1, commit `0c5b7eee67c91539692ec33a7c5d702a0adf4e42`  
**Business:** NorAuto Match, operating through Orr Nissan West  
**Primary market:** Oklahoma City metro

> This document consolidates the implementation and growth notes for the SEO and advertising representatives. The master specification remains the source of truth. It does not create new pipeline names, event names, positioning, or compliance exceptions.

## 1. Executive summary

NorAuto Match is not a separate dealer, independent auto broker, lender, or credit-repair company. It is a personal salesperson experience operating through **Orr Nissan West**.

The offer is deliberately different from a generic inventory wall:

> **Tell me the number. I'll find the car.**

The primary experience starts with a realistic monthly-payment lane, helps the shopper shortlist vehicles, and routes a no-match state into **Vehicle Sourcing** rather than a dead end. The customer receives one accountable contact from the first conversation through delivery and follow-up.

The growth sequence is:

1. Prove the operating standard with direct and organic traffic.
2. Validate lead routing, response speed, appointment quality, and inventory accuracy.
3. Launch controlled high-intent search through approved dealership advertising accounts.
4. Add inventory advertising only after the live feed is accurate, fresh, and eligible.
5. Optimize toward qualified leads, appointments, shows, sold outcomes, contribution margin, and blended CAC—not cheap platform leads or last-click ROAS alone.

## 2. Non-negotiable brand and compliance rules

- Identify **Orr Nissan West** conspicuously on the website and vehicle advertising.
- Keep the direct NorAuto Match line visible: **(405) 861-0061**.
- Also display the dealership phone, address, and official website where appropriate:
  - Orr Nissan West
  - 8800 NW Expressway, Oklahoma City, OK 73162
  - (405) 495-4700
  - https://orrnissanwest.com/
- Do not present NorAuto Match as a separate dealership or licensed auto broker.
- Do not create or recommend a separate salesperson Google Business Profile.
- Route vehicle sales, financing, contracts, registration, and delivery through Orr Nissan West or another explicitly approved licensed selling dealership.
- Do not use unsubstantiated “#1,” “best price,” “lowest price,” or “guaranteed approval” claims.
- Do not use bait pricing, down-payment-only pricing, impossible stacked incentives, fake inventory, dummy Marketplace accounts, or competitor impersonation.
- Payment figures are estimates only. They must identify assumptions and exclude or explain taxes, title, license, dealer/documentary fees, optional products, credit-specific terms, trade variables, and final dealer confirmation.
- Current vehicles and images are representative demonstration content. They are not live inventory and must not be used in production advertising.
- Never send names, email addresses, phone numbers, trade notes, free text, or other PII to Google Analytics, Google Ads, Meta, or other advertising pixels.

## 3. Current PR #1 implementation baseline

Already represented in the functional review build:

- Payment-first reverse-amortization matcher
- Monthly payment, down/equity, term, brand, and body-style controls
- Swipe/pass/shortlist state with persistent dimmed inventory context
- Interactive Matcher and Traditional Browse paths
- Vehicle Sourcing trapdoor when no active match remains
- Standard Retail versus Vehicle Sourcing lead routing
- Direct call/text conversion path
- Orr Nissan West attribution, address, phone, and official link
- Oklahoma City metro service-area pages, including Mustang and Piedmont
- Metadata, canonical area URLs, structured data, sitemap, robots, privacy, and finance disclosures
- Internal `/playbook` and readable `/master-build-prompt` handoff pages

Still gated for production:

- Approved live inventory feed and real unit imagery
- Production CRM destination and end-to-end tests
- Production domain and canonical HTTPS origin
- First-party analytics and ad account IDs
- Consent-language approval and retention policy
- Call-tracking and appointment-system decisions

## 4. Information architecture and SEO page plan

### Required phase-one routes

| Route | Search/customer intent | SEO state | Primary conversion path |
|---|---|---|---|
| `/` | Payment-first vehicle matching in OKC | Index | Build My Match / call / text |
| `/match-brief` | Diagnostic for a vehicle fit | Index | Match Brief → lead |
| `/why-norauto` | Trust, continuity, and process differentiation | Index | Match Brief / direct contact |
| `/how-it-works` | Understand matching, estimates, sourcing, and delivery | Index | Build My Match |
| `/reviews` | Authentic customer proof | Index | Match Brief / direct contact |
| `/guides/car-payment-buying-power-okc` | Payment and buying-power education | Index | Matcher |
| `/guides/best-family-suvs-okc` | Family SUV use-case research | Index | Matcher / browse |
| `/guides/best-trucks-oklahoma` | Truck, towing, payload, and work-use research | Index | Matcher / sourcing |
| `/areas/oklahoma-city` | Local car shopping and sourcing | Index | Matcher / call / text |
| `/areas/yukon` | Yukon local intent | Index | Matcher / call / text |
| `/areas/edmond` | Edmond local intent | Index | Matcher / call / text |
| `/areas/mustang` | Mustang local intent | Index | Matcher / call / text |
| `/areas/piedmont` | Piedmont local intent | Index | Matcher / call / text |
| `/areas/moore` | Moore local intent | Index | Matcher / call / text |
| `/areas/norman` | Norman local intent | Index | Matcher / call / text |
| `/areas/midwest-city` | Midwest City local intent | Index | Matcher / call / text |
| `/privacy` | Privacy and consent transparency | Index if useful | None required |
| `/contact` | Direct contact and fallback path | Index | Call / text / lead |
| `/thank-you/retail` | Retail submission confirmation | **Noindex** | Continue conversation |
| `/thank-you/sourcing` | Sourcing submission confirmation | **Noindex** | Continue conversation |
| `/playbook` | Internal growth and operations handoff | **Noindex/access-controlled** | None |

Do not generate hundreds of thin city/model pages. Every indexable page needs a distinct search intent, original local/use-case information, a clear relationship to Orr Nissan West, and a useful next step.

### Homepage structure

1. **Hero**
   - NorAuto Match at Orr Nissan West
   - “Tell me the number. I'll find the car.”
   - Payment-first explanation
   - Build My Match CTA
   - Text `(405) 861-0061` CTA
2. **Interactive Matcher**
   - Payment, down/equity, term, brand, and body style
   - Accessible pass and shortlist controls
   - Estimate disclosure adjacent to the result
3. **Traditional Browse**
   - Transparent filters/sorting
   - Approved inventory only
   - Permanent Vehicle Sourcing banner
4. **NorAuto Standard**
   - Real match brief
   - Actual-unit video before the drive
   - Numbers with context
   - Follow-through after delivery
5. **Process and trust**
   - One accountable person
   - Orr Nissan West affiliation
   - Authentic approved proof only
6. **Direct conversion**
   - Call, text, and matcher CTA

### Content briefs

**Payment / buying power**

- Explain reverse amortization as an estimate, not approval.
- Show assumptions and examples without implying a guaranteed payment.
- Explain down payment, estimated trade equity, term, taxes/fees, products, and credit terms.
- Link to the matcher, `/how-it-works`, privacy, and contact paths.

**Family SUVs**

- Compare passenger/cargo needs, third-row usefulness, safety features, commute, and payment bands.
- Avoid generic manufacturer copy and unsupported “best” claims.
- Link to the matcher with family-use context.

**Oklahoma trucks**

- Discuss towing, payload, cab/bed, drivetrain, commute, work use, and payment constraints.
- Do not recommend a truck without asking what the customer needs it to do.
- Link to Vehicle Sourcing for exact configurations that are not currently available.

**Why NorAuto**

- One direct contact
- Actual-unit video before driving
- Written numbers with assumptions
- Appointment readiness
- Delivery brief, 72-hour check-in, 30-day check-in, and service handoff

**Reviews**

- Use only authentic, approved reviews.
- Link to the original platform.
- Do not gate review requests, filter sentiment, fabricate testimonials, or tie incentives to positive ratings.

## 5. Technical SEO requirements

- Use one canonical HTTPS origin after the production domain is approved.
- Set `NEXT_PUBLIC_SITE_URL` to that origin before launch.
- Every indexable page needs a unique title, description, H1, useful body copy, and canonical URL.
- Keep the sitemap limited to canonical indexable pages.
- Exclude APIs, internal tools, playbook, and thank-you routes from indexing.
- Use server-rendered primary content for landing pages and guides.
- Use breadcrumbs on guides and service-area pages.
- Use structured data that reflects NorAuto Match as a website/service experience published through Orr Nissan West—not as a separate dealer.
- Validate address, phone, dealership relationship, and URL consistency across visible copy, metadata, JSON-LD, and advertising landing pages.
- Create a redirect map before changing existing routes.
- Remove or return the correct status for sold or removed vehicle pages; do not leave stale VDPs indexable.
- Verify Search Console ownership and submit the sitemap after the domain is connected.
- Target WCAG 2.2 AA and strong mobile Core Web Vitals. Avoid blocking third-party scripts.

## 6. Advertising handoff

### Acquisition sequence

**Phase 1 — proof before paid reach**

- Publish useful short-form content around payment matching, deal decoding, truck fit, actual-unit video, honest recommendations, and delivery proof.
- Respond to direct leads during posted hours with a target median under 10 minutes at launch.
- Produce an actual-unit video for every qualified appointment once real inventory is connected.
- Record source, first response, appointment, show, sale, gross where approved, and review outcome in CRM.

**Phase 2 — high-intent search**

Run through approved Orr Nissan West advertising structures. Initial intent lanes:

- cars by monthly payment Oklahoma City
- car finder Oklahoma City
- personal car shopper OKC
- cars under a monthly payment in OKC
- help finding a car Oklahoma City
- family SUV Mustang OK
- truck finder Yukon OK
- car delivery Piedmont OK

Do not begin with broad “car” traffic. Do not bid competitor dealer names in phase one. Map each intent to a useful landing page or the matcher, not a generic inventory wall.

**Phase 3 — inventory media**

Only after live feed accuracy is proven:

- Connect eligible dealer inventory through approved Google Merchant Center/Vehicle Ads structures.
- Use approved Meta Automotive Inventory Ads or regular content/lead formats through dealer assets.
- Pass vehicle ID/VIN, campaign, source, UTM values, and salesperson attribution into CRM.
- Upload only approved offline outcomes using consent-compliant, platform-approved identifiers.

### Landing-page map

| Intent | Landing page | Primary CTA | Required proof/disclosure |
|---|---|---|---|
| Monthly-payment shopping | `/` or payment guide | Build My Match | Estimate assumptions and Orr Nissan West attribution |
| Personal car shopper / car finder | `/match-brief` | Start Match Brief | One-person continuity and sourcing explanation |
| Family SUV | Family SUV guide | Match family needs | Original comparison and no unsupported ranking claims |
| Oklahoma truck | Truck guide | Match truck to job | Towing/payload/use-case qualification |
| Exact vehicle unavailable | Matcher/browse sourcing state | Let Me Work For You | Vehicle Sourcing pipeline language |
| Direct contact | `/contact` or approved landing page | Call/text | Direct number and dealer identity |

### Conversion and measurement gates

Do not optimize paid campaigns to form submissions alone until the following are true:

- CRM accepts both pipeline values correctly.
- Duplicate/retry behavior is tested.
- First-touch and latest-touch fields are preserved.
- Consent is stored with version and timestamp.
- `lead_submitted` fires only after server-confirmed acceptance.
- No PII appears in analytics, ad pixels, URLs, or logs.
- Qualified, appointment, show, sold, and delivered outcomes can be reported.
- Inventory IDs remain consistent from page view through opportunity and sold outcome.

## 7. Shared event dictionary

Preserve these exact event names. Do not rename or invent parallel taxonomy without documenting and approving the change.

| Event | Trigger | Allowed non-PII parameters |
|---|---|---|
| `matcher_started` | First matcher interaction | Page, session ID |
| `buying_power_changed` | Payment/down/term change | Payment band, down band, term |
| `vehicle_viewed` | Vehicle card or VDP viewed | Vehicle ID, make, model, condition |
| `vehicle_passed` | Pass action | Vehicle ID, context/reason |
| `vehicle_shortlisted` | Shortlist action | Vehicle ID, shortlist count |
| `trapdoor_viewed` | Vehicle Sourcing state displayed | Active filters, payment band |
| `traditional_browse_opened` | Browse opened | Page |
| `lead_form_opened` | Form opened | Pipeline, trigger |
| `lead_form_step_completed` | Progressive step completed | Pipeline, step number |
| `lead_submitted` | Server-confirmed CRM acceptance | Pipeline, trigger, submission ID |
| `appointment_requested` | Appointment/request action | Pipeline, page |
| `phone_clicked` | Direct call CTA | Placement, page |
| `text_clicked` | Direct SMS CTA | Placement, page |

Never include names, email, phone, precise identifying ZIP, trade notes, free-text notes, or consent text in event payloads.

## 8. CRM and attribution contract

### Pipeline values

- `Standard Retail` — normal approved inventory inquiry
- `Vehicle Sourcing` — no-match, deck-exhausted, exact-vehicle-unavailable, or explicit sourcing request

### Lead envelope

The website-to-CRM contract is versioned and includes:

- `schema_version`
- `submission_id`
- `submitted_at`
- `pipeline`
- `trigger`
- contact details
- consent object
- shopping/payment context
- optional trade context
- selected, shortlisted, rejected, and viewed vehicle IDs
- first-touch and latest-touch attribution

The server validates the pipeline and consent; client-supplied hidden fields are not trusted.

### Attribution fields

Store first-touch and latest-touch separately:

- source
- medium
- campaign
- content
- term
- GCLID
- GBRAID/WBRAID
- FBCLID
- landing page
- referrer
- submission ID
- approved session ID

First touch is never overwritten. Latest touch may update according to the approved CRM rule.

## 9. Launch checklist

### Before SEO publication

- [ ] Final domain and canonical origin approved
- [ ] Orr Nissan West attribution reviewed on every indexable template
- [ ] Unique copy, title, description, H1, canonical, and internal links reviewed
- [ ] Schema relationship reviewed
- [ ] Sitemap and robots reviewed
- [ ] No thin city/model pages created
- [ ] Reviews and proof approved with original-platform links
- [ ] Payment disclosures reviewed
- [ ] Demo inventory and AI imagery excluded from production claims

### Before paid traffic

- [ ] Live inventory feed passes freshness/status tests
- [ ] CRM webhook and both pipelines pass end-to-end tests
- [ ] Retry/idempotency tests pass
- [ ] Consent and opt-out behavior passes
- [ ] Analytics events fire once and contain no PII
- [ ] Landing-page phone/text CTAs work
- [ ] Response owner and posted hours are operational
- [ ] Offline conversion path is approved
- [ ] Campaign naming and UTM conventions are documented
- [ ] Budget, target CAC, appointment target, show target, and stop rules are approved

### Production decisions still required

- Production domain
- Brand email
- Public display name and headshot
- Posted response hours
- CRM platform
- SMS/email provider
- Calendar system
- Approved live inventory feed
- Dealer CRM/DMS integration requirements
- Analytics and ad account IDs
- Call-tracking decision
- Consent-language approval
- Data-retention period
- Roles and permissions
- Written dealership approval archive

## 10. Explicit deviations

**None requested.**

This note recommends a server-side CRM adapter, first-party consent-aware measurement, and fail-closed inventory/error states. Those are implementation safeguards that preserve the master specification rather than changing it.

## 11. Ownership split

- **SEO:** intent validation, content briefs, internal links, metadata, schema, crawl/indexation, Search Console.
- **Advertising:** channel plan, keywords/audiences, creative, landing-page mapping, budget/bidding, platform conversions, offline conversion optimization.
- **Website/CRM:** customer experience, data contract, pipeline values, event names, inventory identity, consent, routing, and technical reliability.
- **Orr Nissan West / approved dealership leadership:** legal identity, inventory approval, advertising-account access, CRM policy, consent, roles, and final production approval.

SEO and Advertising should improve execution against the shared system; they should not independently rename pipelines, redefine events, create a separate dealership identity, send PII to pixels, or override inventory/compliance rules.

## Immediate next action

Lock the production decision sheet, then run the contract-first vertical slice for one Standard Retail lead and one Vehicle Sourcing lead before opening paid traffic. The first paid campaigns should be high-intent, tightly mapped, and judged by qualified pipeline and downstream sold outcomes—not form volume.
