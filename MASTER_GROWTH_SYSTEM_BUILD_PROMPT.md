# NorAuto Match — Master Website + CRM Build Prompt

**Version:** 1.0  
**Date:** August 15, 2026  
**Business owner:** NorAuto Match / Orr Nissan West  
**Growth systems owner:** Mark  
**Status:** Approved concept; production integrations pending

---

## How to use this document

This is the source-of-truth prompt for the website and CRM implementation teams. Give the complete document to both teams. Each team must understand the entire customer journey even when implementing only one layer.

Do not treat this as a mood board. Treat it as a product, data, conversion, and operational specification.

Teams may recommend a technically superior implementation, but they must document:

1. the proposed change;
2. the reason;
3. the impact on conversion, attribution, compliance, data, and other teams; and
4. whether the change modifies a non-negotiable requirement.

Ask questions only when the answer materially changes architecture, compliance, cost, or launch timing. Otherwise make a documented assumption and proceed.

---

# MASTER PROMPT

You are building the production growth and sales system for **NorAuto Match**, a personal salesperson brand operating through **Orr Nissan West** in Oklahoma City, Oklahoma.

NorAuto Match is not a separate dealership, independent auto broker, lender, or credit-repair company. All vehicle sales, financing, contracts, registration, and delivery must be completed by Orr Nissan West or another explicitly approved licensed selling dealership.

The website and CRM must operate as one system:

> **Traffic → useful diagnostic → vehicle match or approved sourcing route → direct contact → appointment → showroom/desking → sale → delivery → follow-up → review/referral → future purchase/service nurture.**

The system must make one person accountable from the first customer interaction through delivery and after-sale follow-up.

## Brand foundation

**Brand name:** NorAuto Match  
**Dealership attribution:** at Orr Nissan West  
**Primary promise:** Tell me the number. I'll find the car.  
**Supporting promise:** Your direct shopping line at Orr Nissan West.  
**Experience position:** Country-store humanity. Luxury-level follow-through. Big-store access.  
**Primary direct number:** (405) 861-0061  
**Dealership:** Orr Nissan West  
**Dealership phone:** (405) 495-4700  
**Dealership address:** 8800 NW Expressway, Oklahoma City, OK 73162  
**Official dealership website:** https://orrnissanwest.com/  
**Primary market:** Oklahoma City metro  
**Initial cities:** Oklahoma City, Yukon, Edmond, Mustang, Piedmont, Moore, Norman, Midwest City

## Commercial objective

Build a first-party lead and follow-up engine that:

1. creates qualified direct conversations;
2. converts monthly-payment and vehicle-fit intent into realistic options;
3. preserves the customer's original source and journey context;
4. routes normal inventory inquiries separately from vehicle-sourcing requests;
5. enforces a measurable speed-to-lead process;
6. improves appointment set, show, and sold rates;
7. creates authentic customer proof and repeat/referral opportunities; and
8. remains attributable to the approved employing dealership.

## Primary success metrics

- Median first response during posted hours: under 10 minutes at launch, under 5 minutes by day 90
- Qualified-lead-to-appointment rate: 45%+
- Appointment show rate: 70%+
- Show-to-sold rate: establish baseline, then improve 20%
- Lead routing success: 100%
- Eligible delivered buyers asked for an honest review: 100%
- Duplicate contact rate: below 2%
- Inventory freshness: under 24 hours; preferred under 4 hours
- Form delivery failure: below 0.5%
- Attribution completeness for paid leads: above 95%

Do not publish these internal targets as performance guarantees.

---

# NON-NEGOTIABLE OPERATING RULES

1. The payment-first matcher remains the primary website experience.
2. The website must also provide a traditional inventory path.
3. When no active match remains, the experience must route into **Vehicle Sourcing** rather than dead-ending.
4. Standard inventory inquiries and Vehicle Sourcing requests must remain distinguishable in CRM.
5. Orr Nissan West must be identified conspicuously on the website and vehicle advertising.
6. The customer's source, landing page, campaign, selected vehicles, matcher inputs, and consent state must reach CRM.
7. No PII may be sent to Google Analytics, Google Ads, Meta, or other advertising pixels.
8. No Social Security number, driver's-license image, bank account, or full credit application may be collected by this website.
9. The site may explain estimated buying power but may not imply approval, guaranteed financing, or final payment terms.
10. Do not create or recommend a separate salesperson Google Business Profile. Corporate sales associates and lead-generation agents are not eligible individual practitioners under Google's published guidance.
11. Do not create fake Marketplace accounts, false inventory, bait pricing, down-payment-only prices, or impossible stacked incentives.
12. Never allow a sold or stale vehicle to remain promoted as available when the inventory source identifies it as sold.
13. Never replace the NorAuto experience with an iframe of the dealership website.
14. Do not make broad “#1,” “best price,” “lowest price,” or “guaranteed approval” claims without documented substantiation and compliance approval.
15. Website, CRM, Ads, SEO, and dealership data definitions must use the same pipeline names, event names, source values, and vehicle identifiers.

---

# CUSTOMER SEGMENTS AND JOBS TO BE DONE

## Segment A — Payment-led shopper

**Situation:** Knows the comfortable monthly number but not the right vehicle price.  
**Job:** “Help me understand what realistically fits without embarrassing me or wasting my Saturday.”  
**Primary path:** Payment matcher → shortlist → Standard Retail inquiry or Vehicle Sourcing.  
**Required CRM context:** target payment, down/trade equity, term, body type, must-haves, timing.

## Segment B — Exact-vehicle shopper

**Situation:** Knows the model, trim, color, or equipment but cannot find the correct unit.  
**Job:** “Find the exact vehicle and tell me what is actually available before I drive.”  
**Primary path:** Search/guide/inventory → actual-unit inquiry → approved sourcing if unavailable.  
**Required CRM context:** year/make/model/trim, acceptable alternatives, color, distance, timing.

## Segment C — Busy or dealership-averse shopper

**Situation:** Values time, direct communication, and clarity more than browsing.  
**Job:** “Give me one person and a clear sequence.”  
**Primary path:** Why NorAuto / referral / social content → Match Brief → appointment.  
**Required CRM context:** contact preference, best time, desired process, delivery needs.

## Segment D — Truck/use-case shopper

**Situation:** Needs towing, payload, work, rural travel, family space, or 4x4 capability.  
**Job:** “Match the truck to the actual job and prevent me from buying the wrong configuration.”  
**Primary path:** Truck guide/content → use-case diagnostic → inventory or sourcing.  
**Required CRM context:** towing weight, payload/use, cab/bed, drivetrain, commute, budget.

## Segment E — Trade-sensitive shopper

**Situation:** Purchase depends on equity, payoff, and condition.  
**Job:** “Show me how my trade affects the deal without pretending an estimate is final.”  
**Primary path:** Matcher/trade form → appraisal appointment.  
**Required CRM context:** year/make/model, mileage, payoff estimate, condition notes; no title/identity documents on the public site.

---

# WEBSITE TEAM PROMPT

You are the senior product, UX, conversion, SEO-technical, and full-stack team responsible for finalizing the NorAuto Match production website.

Use the existing Next.js/TypeScript/Tailwind implementation as the functional prototype and source repository. Preserve the successful concepts; refactor where needed for maintainability, performance, security, accessibility, and integrations.

## Website objectives

1. Explain the offer in under five seconds.
2. Move the user into a useful interaction before asking for extensive contact information.
3. Preserve choice between Interactive Matcher and Traditional Browse.
4. Convert no-match states into Vehicle Sourcing requests.
5. provide direct call/text paths throughout mobile and desktop.
6. send complete, validated, attributed data to CRM.
7. create technically sound indexable pages for local and buyer-intent SEO.
8. remain accurate when inventory or integrations fail.

## Required information architecture

### Phase-one pages

- `/` — hero, proof, Interactive Matcher, Traditional Browse, NorAuto Standard, process, CTA
- `/match-brief` — progressive vehicle-needs diagnostic
- `/why-norauto` — one person, actual-unit video, numbers with context, appointment readiness, after-sale follow-through
- `/how-it-works` — complete process and estimate explanation
- `/reviews` — authentic approved reviews with original-platform links; no review gating
- `/guides/car-payment-buying-power-okc`
- `/guides/best-family-suvs-okc`
- `/guides/best-trucks-oklahoma`
- `/areas/oklahoma-city`
- `/areas/yukon`
- `/areas/edmond`
- `/areas/mustang`
- `/areas/piedmont`
- `/areas/moore`
- `/areas/norman`
- `/areas/midwest-city`
- `/privacy`
- `/contact`
- `/thank-you/retail` — noindex
- `/thank-you/sourcing` — noindex
- `/playbook` — internal, noindex and preferably access-controlled in production

Do not generate hundreds of thin city/model combinations. Every indexable page must contain original, useful information and a distinct search intent.

## Homepage requirements

### Hero

Must include:

- NorAuto Match at Orr Nissan West
- “Tell me the number. I'll find the car.”
- one-line payment-first explanation
- primary CTA: Build My Match
- secondary CTA: Text (405) 861-0061
- visible Orr Nissan West attribution
- no unsubstantiated price, volume, or ranking claim

### NorAuto Standard

Communicate these four promises:

1. A real match brief
2. Actual-unit video before the drive
3. Numbers with context
4. Follow-through after delivery

### Trust layer

Use only approved proof:

- authentic reviews with links
- approved delivery photos and stories
- dealer affiliation
- response standard once it is operationally met
- real inventory freshness timestamp

Do not use stock customer portraits, fabricated reviews, unsupported sales numbers, or competitor attacks.

## Interactive Matcher requirements

### Inputs

- Monthly target: $300–$1,000; default $600
- Down payment / estimated trade equity: $0–$15,000; default $5,000
- Term: 36, 48, 60, 72 months
- Assumed APR: configurable; launch display 7% only if approved
- Brand inclusion/exclusion
- Body style
- Optional later inputs: mileage preference, drivetrain, seating, towing/use case

### Calculation

Use standard amortization reversal:

```text
monthly_rate = annual_rate / 12
financed_amount = monthly_payment * (1 - (1 + monthly_rate)^(-term_months)) / monthly_rate
estimated_buying_power = financed_amount + down_payment_or_equity
```

The UI must clearly state:

- estimate only;
- taxes, title, license, dealer/documentary fees, optional products, and credit-specific terms are not included unless explicitly modeled;
- this is not an offer of credit or approval;
- final numbers are confirmed by the licensed dealer.

### Swipe behavior

- Swipe/pass button dims a vehicle in the master feed.
- Shortlist button gives the vehicle a persistent green state.
- Budget, brand, and body filters dim excluded vehicles rather than silently removing all context.
- State must remain stable during the session.
- Provide keyboard and button alternatives to gestures.
- Do not make swiping the only accessible interaction.

### Vehicle Sourcing route

Trigger when:

- no active matches remain;
- the shopper exhausts the deck;
- the shopper selects an explicit “Find Something Else” CTA; or
- a requested exact vehicle is unavailable.

Use approved language equivalent to:

> Out of stock on our lot, but not out of luck. I will use Orr Nissan West and its approved inventory channels to source the right vehicle, explain the available deal structure, and coordinate the next step.

CTA: **Let Me Work For You**

Pipeline value sent to CRM: `Vehicle Sourcing`

## Traditional Browse requirements

- Show all currently approved, available vehicles.
- Default sorting must be transparent and user-changeable.
- Provide filter and search.
- Display inventory `last_updated_at` where appropriate.
- Permanent sourcing banner at the top.
- Exact vehicle cards must use the approved selling price and actual unit images.
- Each card must link to a canonical VDP or approved inquiry experience.
- Sold vehicles must be removed or marked unavailable immediately and must not accept an ordinary availability lead without explaining status.

## Match Brief form

Use a progressive form. Do not open with a 14-field wall.

### Step 1 — What the vehicle must do

- body style
- passenger count
- primary use
- must-have features
- optional exact model

### Step 2 — Financial shopping lane

- target monthly payment or cash budget
- down payment / estimated trade equity
- preferred term
- payment method: Cash, Financing, Lease, Undecided
- trade-in: Yes/No

### Step 3 — Timing and contact

- purchase timing: 0–7 days, 8–30 days, 31–90 days, Researching
- first name
- last name
- mobile phone
- email
- city / ZIP
- contact preference: Text, Call, Email
- best contact time
- explicit consent checkbox, unchecked by default

### Optional trade details

- year
- make
- model
- mileage
- estimated payoff
- condition notes

Do not collect title images, driver's license, insurance card, Social Security number, bank information, or a full credit application.

## Form states

Every form requires:

- loading state
- field-level validation
- server-side validation
- duplicate-submission protection
- rate limiting and bot mitigation
- accessible errors
- retry-safe submission ID
- clear success state
- fallback call/text path
- CRM delivery status logging without logging PII in application logs

If CRM is unavailable in production, do not show a false success message. Queue securely if an approved queue exists; otherwise explain the failure and provide the direct number.

## Inventory data contract

The website team must consume a normalized feed with at least:

```json
{
  "schema_version": "1.0",
  "dealer_id": "orr-nissan-west",
  "vehicle_id": "stable-internal-id",
  "vin": "VIN",
  "stock_number": "STOCK",
  "condition": "new|used|certified",
  "status": "available|reserved|sold|in_transit|unavailable",
  "year": 2026,
  "make": "Nissan",
  "model": "Rogue",
  "trim": "SV",
  "body_style": "SUV",
  "drivetrain": "FWD",
  "mileage": 12,
  "exterior_color": "Pearl White",
  "selling_price": 29800,
  "msrp": 31500,
  "image_urls": ["https://..."],
  "canonical_vehicle_url": "https://...",
  "location_name": "Orr Nissan West",
  "last_updated_at": "ISO-8601 timestamp"
}
```

Requirements:

- VIN/vehicle ID is the cross-system key.
- Feed updates must be idempotent.
- Price and status changes must propagate quickly.
- Feed failures must not silently convert stale data into “available.”
- Use last-known data only within the approved freshness window.
- Maintain an error dashboard for rejected/missing fields.
- AI-generated placeholder imagery must not remain on production live inventory.

## Lead API contract

Use a versioned, idempotent server-to-server contract. The website must create a UUID `submission_id` before sending.

```json
{
  "schema_version": "1.0",
  "submission_id": "uuid",
  "submitted_at": "ISO-8601",
  "pipeline": "Standard Retail|Vehicle Sourcing",
  "trigger": "retail|trapdoor|match_brief|phone|text|contact",
  "contact": {
    "first_name": "",
    "last_name": "",
    "email": "",
    "phone": "",
    "city": "",
    "postal_code": "",
    "contact_preference": "text|call|email",
    "best_contact_time": ""
  },
  "consent": {
    "contact_consent": true,
    "consent_text_version": "2026-08-15-v1",
    "consented_at": "ISO-8601",
    "page_url": "https://..."
  },
  "shopping": {
    "purchase_timing": "0-7|8-30|31-90|researching",
    "payment_method": "cash|financing|lease|undecided",
    "monthly_target": 600,
    "cash_budget": null,
    "down_payment_or_equity": 5000,
    "term_months": 60,
    "body_styles": ["SUV"],
    "makes": ["Nissan", "Toyota"],
    "must_haves": ["third row"],
    "notes": ""
  },
  "trade": {
    "has_trade": true,
    "year": 2020,
    "make": "Ford",
    "model": "Escape",
    "mileage": 75000,
    "estimated_payoff": 12000,
    "condition_notes": ""
  },
  "vehicle_context": {
    "selected_vehicle_ids": [],
    "shortlisted_vehicle_ids": [],
    "rejected_vehicle_ids": [],
    "last_viewed_vehicle_id": null
  },
  "attribution": {
    "first_landing_page": "",
    "current_landing_page": "",
    "referrer": "",
    "utm_source": "",
    "utm_medium": "",
    "utm_campaign": "",
    "utm_content": "",
    "utm_term": "",
    "gclid": "",
    "gbraid": "",
    "wbraid": "",
    "fbclid": "",
    "first_touch_at": "ISO-8601",
    "last_touch_at": "ISO-8601"
  }
}
```

Do not trust client-supplied pipeline or consent fields without server validation.

## Analytics event contract

Implement through a first-party data layer. Event names must not change without coordinated CRM/Ads/SEO approval.

| Event | Trigger | Required non-PII parameters |
|---|---|---|
| `matcher_started` | First matcher interaction | page, session ID |
| `buying_power_changed` | Payment/down/term change | payment band, down band, term |
| `vehicle_viewed` | Vehicle card/VDP viewed | vehicle ID, make, model, condition |
| `vehicle_passed` | Pass action | vehicle ID, reason/context |
| `vehicle_shortlisted` | Shortlist action | vehicle ID, shortlist count |
| `trapdoor_viewed` | Vehicle Sourcing state displayed | active filters, payment band |
| `traditional_browse_opened` | Browse tab opened | page |
| `lead_form_opened` | Form opens | pipeline, trigger |
| `lead_form_step_completed` | Progressive step completed | pipeline, step number |
| `lead_submitted` | Server-confirmed CRM acceptance | pipeline, trigger, submission ID; no PII |
| `phone_clicked` | Direct call CTA | placement, page |
| `text_clicked` | SMS CTA | placement, page |
| `appointment_requested` | Calendar/request action | pipeline, page |

Analytics must not receive name, email, phone, ZIP at a granularity that identifies a person, trade notes, free-text notes, or consent text.

## SEO requirements

- One canonical HTTPS origin
- Unique title, description, H1, and useful copy per indexable page
- XML sitemap with only canonical indexable URLs
- Robots rules blocking APIs, internal tools, thank-you pages, and playbook
- Structured data that reflects the real relationship: website/service published through Orr Nissan West; do not present NorAuto Match as a separate dealer
- Breadcrumbs on guides and service-area pages
- Internal links based on user intent, not footer spam
- Server-rendered primary content
- Correct 404/410 behavior for removed pages and sold VDPs
- Redirect map for any URL changes
- No doorway pages, location-name swapping, or copied manufacturer text
- Search Console verification and sitemap submission at launch

## Performance and accessibility

Target:

- WCAG 2.2 AA
- Lighthouse mobile Performance 90+ on core landing pages
- Accessibility 95+
- SEO 95+
- LCP under 2.5 seconds at the 75th percentile
- CLS under 0.1
- INP under 200 milliseconds

Requirements:

- semantic HTML
- keyboard-complete matcher and modal
- visible focus states
- reduced-motion support
- labelled inputs and errors
- sufficient contrast
- optimized responsive images
- no blocking third-party scripts without justification
- consent-aware marketing tags

## Security and privacy

- Secrets only on the server
- TLS everywhere
- Strict schema validation
- Rate limiting
- Bot mitigation/honeypot
- Content Security Policy
- Secure headers
- Least-privilege integration credentials
- No PII in analytics, URLs, error trackers, or ordinary application logs
- Documented retention and deletion process
- Versioned consent language
- Dependency and vulnerability scanning
- Backups/export strategy for CMS content and configuration

## Website deliverables

1. Approved sitemap and wireframes
2. Component/design system
3. Responsive production implementation
4. Inventory integration and failure states
5. Lead API implementation
6. Analytics data layer and event test plan
7. CMS/editor workflow for guides, FAQs, and reviews
8. SEO implementation and redirect map
9. Accessibility report
10. Performance report
11. Security/configuration checklist
12. Deployment and rollback runbook
13. QA evidence for every acceptance test
14. Administrator documentation

---

# CRM TEAM PROMPT

You are the senior revenue-operations, CRM architecture, lifecycle automation, data-governance, and reporting team responsible for the NorAuto Match lead-to-delivery system.

Build vendor-neutrally first, then map every object, field, workflow, permission, and report into the selected platform. Do not let platform defaults dictate the sales process.

## CRM objectives

1. Preserve every lead's intent and attribution.
2. Make ownership unambiguous.
3. enforce speed-to-lead.
4. separate Standard Retail and Vehicle Sourcing operations.
5. prevent duplicate contacts and opportunities.
6. make next action and aging visible.
7. automate coordination without pretending automation is a human.
8. connect sold outcomes back to acquisition sources.
9. create a clean after-sale/review/referral process.

## Required CRM objects

### Contact

One person record per customer.

Required fields:

- CRM contact ID
- first name
- last name
- normalized mobile phone
- normalized email
- city
- postal code
- contact preference
- best contact time
- SMS consent status and timestamp
- email consent status and timestamp
- consent language version
- first-touch source fields
- latest-touch source fields
- original landing page
- owner
- created/updated timestamps
- do-not-call / do-not-text / do-not-email flags
- deletion request status

### Opportunity / Vehicle Request

A contact may have multiple requests over time. Do not overwrite prior buying cycles.

Required fields:

- opportunity ID
- pipeline
- stage
- status
- assigned owner
- lead source
- trigger
- purchase timing
- monthly target
- cash budget
- down payment / estimated equity
- preferred term
- payment method
- body style
- makes/models
- must-haves
- selected and shortlisted vehicle IDs/VINs
- sourcing notes
- trade details
- appointment date/time
- showed status
- desking status
- sold status/date
- sold VIN/stock number
- gross fields only if access is approved
- lost reason
- lost competitor, if voluntarily known
- next action
- next action due date
- created/updated timestamps

### Vehicle

Use VIN or approved stable vehicle ID as the primary cross-system identifier.

Required fields:

- vehicle/VIN ID
- stock number
- year/make/model/trim
- new/used/certified
- price
- status
- location
- canonical VDP
- last feed update
- associated opportunities

### Activity

- call
- SMS
- email
- note
- video sent
- match brief sent
- appointment
- showroom visit
- task
- consent change
- stage change
- delivery follow-up
- review request

Every automated activity must identify itself as automated in audit data.

## Pipelines

### Pipeline A — Standard Retail

1. New
2. Attempting Contact
3. Connected / Qualified
4. Vehicle Selected
5. Appointment Set
6. Appointment Confirmed
7. Showed
8. Desking / Trade / Credit
9. Sold
10. Delivered
11. Nurture
12. Lost

### Pipeline B — Vehicle Sourcing

1. New
2. Attempting Contact
3. Connected / Qualified
4. Match Brief Complete
5. Options Sent
6. Vehicle Sourced
7. Appointment Set
8. Appointment Confirmed
9. Showed
10. Desking / Trade / Credit
11. Sold
12. Delivered
13. Nurture
14. Lost

Do not create separate contact records for each pipeline. Use separate opportunities under the same deduplicated contact.

## Stage requirements

Every stage must have:

- entry criteria
- required fields
- owner
- required next action
- maximum healthy age
- exit criteria
- automation allowed
- automation prohibited
- reporting definition

A stage cannot exist only because the CRM vendor included it by default.

## Deduplication

- Normalize phone numbers to E.164.
- Normalize emails to lowercase and trim aliases only where safe.
- Match first on exact phone, then exact email.
- Do not auto-merge conflicting people solely because they share an address or household.
- Preserve all original source records and submission IDs.
- New request from an existing contact should create/update the appropriate opportunity, not erase historical attribution.
- Flag ambiguous matches for manual review.

## Ownership and routing

Default owner: the approved NorAuto Match salesperson.

Routing rules:

- Website direct leads remain assigned to the approved owner unless documented dealership policy requires reassignment.
- Standard Retail submission → Standard Retail pipeline.
- No-match, deck-exhausted, exact-vehicle-unavailable, or explicit sourcing submission → Vehicle Sourcing pipeline.
- Existing open opportunity → append activity and notify owner; do not create a silent duplicate.
- Existing sold customer with a new buying request → create a new opportunity tied to the contact.
- Every routing decision must be auditable.

## Speed-to-lead automation

During approved posted hours:

1. **0 minutes:** Create/merge contact and opportunity; send consent-compliant confirmation; alert owner.
2. **5 minutes:** If no human activity, send internal reminder.
3. **15 minutes:** If no human activity, escalate internally according to approved dealership policy.
4. **2 hours:** Create second-attempt task.
5. **End of day:** Place unresolved lead in next-business-day queue.

Outside posted hours:

- send a clear automated receipt stating when a human will respond;
- create a task for opening time;
- do not pretend the message is a live human response.

Measure first response from CRM creation to first genuine two-way/human outbound attempt according to an agreed definition.

## Contact cadence

Use channel preference and consent. Stop immediately on opt-out.

Suggested unresolved-lead cadence:

- Immediate confirmation
- Human call/text attempt within SLA
- 2-hour follow-up
- Next business morning
- Day 3 value message
- Day 7 useful option/guide
- Day 14 close-the-loop message
- Then permission-based nurture only

Do not send repetitive “still interested?” messages. Every touch must add value, ask a useful question, provide an option, or clarify the next step.

## Appointment automation

At appointment creation:

- verify vehicle/status;
- create staging task;
- create actual-unit video task if not sent;
- send calendar confirmation;
- include address, salesperson/direct number, expected duration, and what to bring;
- do not request sensitive credit documents by unsecured email/text.

Reminders:

- immediately
- 24 hours before
- 2 hours before

No-show:

- alert owner after 15 minutes;
- send respectful recovery message;
- create next-morning task;
- record no-show reason if known.

## Match Brief workflow

When qualified:

1. Confirm payment/budget is an estimate, not an approval.
2. Confirm use case and must-haves.
3. Generate a task to select up to three realistic options.
4. Associate each vehicle/VIN with the opportunity.
5. Send a human-reviewed match brief.
6. Record which option the customer viewed/responded to.
7. Route unavailable options into sourcing rather than substituting silently.

## Sold and delivery workflow

At sold:

- require sold VIN/stock number;
- preserve original and latest attribution;
- store sale date;
- close other conflicting open opportunities only after owner review;
- create delivery checklist.

At delivered:

- delivery-day thank-you
- 72-hour check-in task
- 30-day check-in task
- service-introduction task
- honest review request to every eligible buyer using the same neutral process
- no review gating, sentiment filtering, or incentive tied to a positive rating

## Long-term lifecycle

Only where consent and dealership policy allow:

- service reminders coordinated with dealer systems
- 9-month relationship check
- 18-month ownership/equity education
- 30-month replacement/equity review
- lease maturity workflow
- birthday/anniversary messaging only if data collection and use are approved

Do not imply guaranteed equity or fabricate trade values.

## Lost reasons

Use controlled values plus optional notes:

- Could not contact
- Timing / not ready
- Payment outside feasible range
- Credit/financing not completed — do not include sensitive details
- Trade gap
- Vehicle unavailable
- Wrong vehicle fit
- Purchased elsewhere
- Price/deal structure
- Distance/logistics
- Duplicate/test/spam
- Opted out
- Other

“Purchased elsewhere” may optionally record the competitor only when the customer voluntarily provides it. Do not scrape or infer it.

## Lead scoring

Lead score prioritizes follow-up; it must not function as a credit score or protected-class proxy.

Positive intent signals may include:

- purchase timing under 30 days
- completed Match Brief
- shortlisted vehicle
- repeat website session
- actual-unit inquiry
- phone/text click
- appointment request
- trade details supplied

Do not score based on race, ethnicity, gender, religion, disability, precise neighborhood proxies, or inferred creditworthiness.

## Attribution

Store both first touch and latest touch:

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
- website session ID where approved

Never overwrite first-touch values.

Create an offline-conversion export using platform-approved hashed identifiers and consent rules. Do not upload notes, budget, trade details, or other unnecessary PII.

## Required automations

- website submission ingestion
- validation and dead-letter/error handling
- deduplication
- owner assignment
- immediate receipt
- SLA timers and escalation
- progressive task creation
- appointment confirmations/reminders
- no-show recovery
- stale-stage alerts
- sourcing-option follow-up
- sold/delivered follow-up
- review request
- opt-out propagation
- data deletion workflow
- offline conversion export
- integration-health monitoring

Each automation requires an owner, failure alert, retry policy, audit trail, and test case.

## Required dashboards

### Executive funnel

- leads
- qualified leads
- appointments set
- shows
- desks
- sold
- delivered
- conversion by stage
- median response time
- pipeline aging

### Acquisition

- leads and sold outcomes by source/medium/campaign
- cost per lead
- cost per qualified lead
- cost per appointment
- cost per show
- cost per sold unit where spend data is available
- first-touch and latest-touch views

### NorAuto Standard

- actual-unit video sent rate
- Match Brief completion rate
- appointment readiness completion
- 72-hour follow-up completion
- 30-day follow-up completion
- eligible review request rate
- review completion rate

### Quality and data health

- duplicate rate
- missing attribution
- missing consent
- leads with no next action
- stage aging
- webhook failures
- inventory association failures
- opt-out propagation failures

## CRM permissions and governance

- Role-based access
- Least privilege
- Export restrictions
- PII field controls
- Audit logs
- Documented administrator ownership
- No shared user accounts
- Integration credentials in an approved secret store
- Retention and deletion policy
- Backup/export process
- Sandbox/test environment where supported
- Change log for workflows, fields, and stage definitions

## CRM deliverables

1. Entity-relationship/data model
2. Field dictionary with type, allowed values, owner, and purpose
3. Pipeline/stage definitions
4. Routing decision table
5. Automation map
6. Message-template library
7. Consent and opt-out design
8. Deduplication rules
9. Attribution design
10. Dashboard definitions
11. Website webhook/API mapping
12. Inventory/DMS integration map
13. Error handling and dead-letter process
14. Permission matrix
15. Data retention/deletion policy
16. QA/UAT test plan
17. Administrator and salesperson operating guide
18. Launch and rollback plan

---

# SHARED WEBSITE–CRM ACCEPTANCE TESTS

The build is not complete until both teams demonstrate these tests together.

## Lead routing

1. Retail vehicle inquiry creates/updates one contact and one Standard Retail opportunity.
2. Empty-deck submission creates/updates one contact and one Vehicle Sourcing opportunity.
3. Traditional Browse sourcing banner routes to Vehicle Sourcing.
4. Existing contact submitting again does not create an uncontrolled duplicate.
5. Submission ID prevents duplicate opportunities after refresh/retry.

## Context preservation

1. Payment, down/equity, term, filters, and shortlisted vehicles arrive correctly.
2. Exact vehicle/VIN context arrives correctly.
3. First-touch and latest-touch attribution are preserved separately.
4. Consent timestamp, text version, and page are stored.
5. Free-text notes do not appear in analytics platforms.

## Customer experience

1. Confirmation is immediate and accurate.
2. Owner receives an alert.
3. SLA escalation fires only under defined conditions.
4. Opt-out updates every connected messaging system.
5. CRM failure does not produce a false website success state.

## Inventory

1. Price update reaches the website.
2. Sold status removes or disables the vehicle.
3. Stale feed triggers a visible safe fallback.
4. Missing image/price/status does not publish a broken VDP.
5. Vehicle identifier is consistent from page view through sold opportunity.

## Analytics

1. Every defined event fires once.
2. Event parameters match the contract.
3. No PII appears in analytics/network payloads.
4. Paid-click IDs reach CRM.
5. Test sold outcome can be exported back to the correct ad source.

## Accessibility and responsive behavior

1. Matcher works by keyboard and touch.
2. Modal focus is trapped and restored correctly.
3. Errors are announced by assistive technology.
4. Pages work at 390px, 768px, and 1440px.
5. Reduced-motion preference is respected.

## Compliance

1. Orr Nissan West identity is conspicuous.
2. Dealer phone/address/link are present.
3. Payment estimates display assumptions and disclaimers.
4. No guaranteed-approval or unsubstantiated ranking language exists.
5. Live vehicle prices and images match the approved source.

---

# SEO AND ADVERTISING HANDOFF RULES

SEO and Advertising should review this specification before implementation is frozen, but they do not independently redefine the offer, data contract, pipelines, or conversion events.

## SEO owns

- keyword and intent validation
- content briefs
- internal-link recommendations
- metadata recommendations
- schema QA
- crawl/indexation QA
- Search Console launch validation

SEO does not own:

- inventing a separate dealership identity
- changing CRM pipeline definitions
- generating thin location pages
- making unsupported ranking claims

## Advertising owns

- channel plan
- keyword and audience plan
- creative testing
- landing-page mapping
- budget and bidding strategy
- platform conversion configuration
- offline-conversion optimization

Advertising does not own:

- competitor impersonation
- unapproved dealer-name bidding
- payment claims without required disclosures
- changing source/attribution field names
- sending PII into pixels

## Launch sequence

1. Approve positioning, attribution, compliance, and data contracts.
2. Approve website sitemap and CRM object/pipeline design.
3. SEO validates information architecture and launch content briefs.
4. Website and CRM teams build in parallel against the shared contracts.
5. Integrate and complete shared acceptance tests.
6. Advertising validates landing pages, events, and offline conversion flow.
7. Soft launch with organic/direct traffic.
8. Confirm routing, response, appointments, and reporting on real leads.
9. Begin controlled paid-search testing.
10. Add inventory advertising only after the live feed is accurate and eligible.

---

# DECISIONS REQUIRED BEFORE PRODUCTION LAUNCH

These do not block architecture work, but they block final production launch:

- [ ] Production domain
- [ ] Brand email
- [ ] Public display name and approved headshot
- [ ] Posted response hours
- [ ] CRM platform
- [ ] SMS/email provider and sending numbers/domains
- [ ] Calendar/appointment system
- [ ] Approved live inventory source/feed method
- [ ] DMS/dealer CRM integration requirements
- [ ] CRM webhook/API credentials
- [ ] Analytics platform IDs
- [ ] Google Ads account and conversion IDs
- [ ] Meta Business/ad account and pixel/CAPI IDs
- [ ] Call-tracking decision
- [ ] Consent-language approval
- [ ] Data retention period
- [ ] User roles and access approvals
- [ ] Exact scope of written GM/dealership approval archived with project records
- [ ] Compliance review of production pricing/payment presentation

---

# FINAL TEAM INSTRUCTION

Return the following before writing production code or configuring production CRM:

1. assumptions and blockers;
2. proposed architecture;
3. sitemap/wireframes or CRM data model;
4. integration diagram;
5. field/event dictionary;
6. implementation phases with estimates;
7. risk register;
8. acceptance-test mapping; and
9. explicit list of any requested deviations from this specification.

Do not optimize for feature count. Optimize for clean lead context, fast human response, clear vehicle matching, appointment readiness, trustworthy communication, and measurable sold outcomes.
