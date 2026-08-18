# NorAuto Match — Complete Project Brain Dump

**Version:** 1.0  
**Prepared:** August 15, 2026  
**Purpose:** Group discussion, cross-functional alignment, and complete project handoff  
**Status:** Strategy and functional prototype complete; production integrations pending

---

## Read this first

This document is an organized synthesis of the NorAuto Match engagement. It is not a verbatim chat transcript. It consolidates the important decisions, corrections, research, website work, CRM architecture, SEO and advertising strategy, compliance constraints, operating metrics, GitHub handoffs, and unresolved production decisions.

Use this document to give a group the whole picture. Use the linked master specification when a Website or CRM team needs exact field, event, API, automation, and acceptance-test requirements.

### One-paragraph group brief

NorAuto Match is a personal automotive-shopping brand operating through Orr Nissan West in Oklahoma City. Its core promise is **“Tell me the number. I'll find the car.”** Instead of behaving like another dealership inventory wall, it starts with the customer's realistic monthly target, down payment or trade equity, term, and vehicle needs. The site then estimates buying power, lets the shopper pass or shortlist vehicles, keeps a visible feed showing why vehicles fit or do not fit, and converts an empty result into a **Vehicle Sourcing** request through Orr Nissan West and approved inventory channels. The CRM preserves the shopper's context and attribution, separates Standard Retail from Vehicle Sourcing, enforces speed-to-lead, manages appointments and follow-up, and connects sold outcomes back to marketing. The competitive position is **country-store humanity, luxury-level follow-through, and big-store access**—one accountable person from first text through delivery and after-sale care.

---

# 1. Project origin and decision history

## 1.1 What the founder wanted

The original goal was to create a personal automotive brand and lead engine that:

- separates the salesperson's identity from a generic dealership lead queue;
- attracts and owns first-party customer relationships;
- generates direct calls, texts, and qualified inquiries;
- helps shoppers identify realistic vehicles based on budget/payment;
- captures shoppers when current dealership inventory does not contain the right fit;
- develops local SEO authority;
- supports advertising without depending entirely on the dealership's generic website;
- creates a repeatable sales and follow-up process; and
- builds a personal book that survives changes in campaigns, platforms, and eventually employment—subject to legal, licensing, employer, and customer-data restrictions.

## 1.2 Early project correction

The initial work was mistakenly associated with IGNICheck. That was corrected. IGNICheck is a separate property and is not part of this project.

The correct repository and brand are:

- **Repository:** `norrijam405/NorAutoMatch`
- **Brand:** NorAuto Match
- **Current development branch:** `arena/01a00129-norautomatch`
- **Pull request:** #1

## 1.3 Brand-name decision

Two candidate names were discussed:

- NorAuto Match
- NorrisAutoConnection

**NorAuto Match** won because it is shorter, easier to say, easier to display on mobile, more memorable, and directly describes the offer.

## 1.4 Employer and dealership relationship

The operator works at **Orr Nissan West** in Oklahoma City. The owner reported that the GM approved the personal-brand concept.

Approval is important, but the project must remain inside the actual documented scope. Approval should be preserved with project records and should cover, at minimum:

- personal website/brand use;
- dealership identification;
- inventory and image use;
- paid advertising;
- lead ownership and routing;
- direct phone use;
- CRM access and customer data;
- dealership marks and disclaimers;
- vehicle sourcing channels; and
- review/referral practices.

## 1.5 Contact and geographic decisions

**Direct customer number:** (405) 861-0061  
**Dealership phone:** (405) 495-4700  
**Dealership address:** 8800 NW Expressway, Oklahoma City, OK 73162  
**Official dealership site:** https://orrnissanwest.com/

Initial market:

1. Oklahoma City
2. Yukon
3. Edmond
4. Mustang
5. Piedmont
6. Moore
7. Norman
8. Midwest City

Mustang and Piedmont were specifically added because of their growth and relevance to family, commuter, truck, and second-vehicle demand.

## 1.6 Brand email

A dedicated NorAuto Match Google account/email was recommended so brand assets do not live under a personal inbox or dealership-controlled email. The exact new email address has not been recorded in the repository and remains a production input.

The brand account should control or have approved access to:

- domain registrar;
- website hosting;
- Search Console;
- Analytics;
- YouTube;
- advertising accounts where dealership policy allows;
- social profiles; and
- recovery information.

Ownership and access must still comply with Orr Nissan West policy and written approval.

---

# 2. Critical Google Business Profile and licensing correction

## 2.1 What changed

Earlier brainstorming considered positioning NorAuto Match as an “Auto broker” and creating a service-area Google Business Profile. Additional research showed that this is not the correct structure for an employed dealership salesperson.

Google's published Business Profile guidance says corporate sales associates and lead-generation agents are not eligible individual practitioners. An employed salesperson should not create a separate practitioner profile merely because they have a direct book of business.

Therefore:

- Do not create or continue a separate NorAuto Match “Auto broker” Google Business Profile unless the legal/licensing model genuinely changes.
- Do not represent NorAuto Match as a separate dealership.
- Do not represent NorAuto Match as an independent auto brokerage.
- Build Google authority through Orr Nissan West's eligible presence, the organic NorAuto Match website, approved staff/author pages, Search Console, social content, and authentic dealership/employee reviews.

Reference: [Google Business Profile representation guidelines](https://support.google.com/business/answer/3038177?hl=en)

## 2.2 What to do if the profile exists

- If still a draft or unverified: do not submit it as Auto broker.
- If already live or under verification: stop making random changes. Align the resolution with dealership management and, if necessary, Google support.
- Do not create a second listing to “fix” the first one.

## 2.3 Oklahoma advertising identity

Oklahoma regulator guidance flags salesperson vehicle advertising that omits the employing dealership. The NorAuto site and advertising must identify **Orr Nissan West** conspicuously.

The current prototype was corrected to include:

- NorAuto Match at Orr Nissan West in the header;
- dealership name, address, phone, and official link in the footer;
- provider structured data tied to Orr Nissan West;
- sales and financing language tied to the licensed selling dealership; and
- Vehicle Sourcing terminology instead of Auto Brokerage.

References:

- [Oklahoma advertisement violations guidance](https://oklahoma.gov/oumvdmhc/about-oumvdmhc/newsroom/2022/advertisement-violations.html)
- [Oklahoma new-vehicle advertising rules](https://oklahoma.gov/content/dam/ok/en/onmvc/documents/title465-advertising-rules-09-23.pdf)
- [Dealer price advertising compliance information](https://oklahoma.gov/onmvc/laws-rules-statutes/dealer-advertising-rules-compliance-information.html)

This project documentation is strategic guidance, not a substitute for dealership counsel or compliance review.

---

# 3. Brand architecture

## 3.1 Core brand

**Name:** NorAuto Match  
**Required dealership attribution:** at Orr Nissan West  
**Primary promise:** Tell me the number. I'll find the car.  
**Supporting promise:** Your direct shopping line at Orr Nissan West.  
**Experience position:** Country-store humanity. Luxury-level follow-through. Big-store access.

## 3.2 Category to own

Do not try to become “the largest dealer” or claim to appear for every car search.

Own this category:

> **The most trusted direct car-shopping contact in the northwest Oklahoma City metro.**

That category can be earned with operating proof:

- response speed;
- useful match briefs;
- actual-unit videos;
- appointment readiness;
- clear written context around numbers;
- delivery follow-through;
- reviews;
- referrals; and
- sold outcomes.

## 3.3 Voice

- direct;
- calm;
- useful;
- personal;
- not “salesy nice”;
- transparent about assumptions;
- confident without fake guarantees;
- able to explain vehicle and payment tradeoffs in plain language.

Avoid:

- “best prices in Oklahoma”;
- “everybody approved”;
- “name your payment”;
- “guaranteed trade amount”;
- fake urgency;
- competitor attacks;
- impossible incentives;
- corporate dealership filler; and
- generic AI-written city paragraphs.

## 3.4 Visual direction

Current prototype direction:

- slate-800/900 and deep ink background;
- amber primary accent;
- emerald shortlist/success accent;
- cinematic Oklahoma City vehicle imagery;
- premium but approachable;
- mobile-first controls;
- strong contrast and large direct CTAs.

The site should feel more like a high-end personal client experience than a traditional dealership template.

---

# 4. The NorAuto Standard

Every direct lead should receive the same operating experience.

## 4.1 One accountable person

The customer should know who owns the next action. They should not bounce between BDC, salesperson, desk, and service with no continuity.

## 4.2 A real Match Brief

The Match Brief converts:

- payment or cash budget;
- down payment/trade equity;
- term preference;
- body style;
- passenger count;
- primary use;
- must-have features;
- timing; and
- trade context

into up to three realistic options.

## 4.3 Actual-unit video before the drive

For every qualified appointment where an exact vehicle exists, provide a real walkaround covering:

- exterior condition;
- visible flaws;
- tires;
- interior;
- cargo/passenger space;
- key options;
- mileage;
- stock/VIN confirmation; and
- anything that could make the trip unnecessary.

## 4.4 Numbers with context

Do not promise a final OTD figure before all variables are known. Provide a written recap of:

- selling price;
- dealer/documentary fee;
- estimated taxes/title/license;
- down payment or trade assumption;
- estimated payoff/equity;
- APR assumption;
- term;
- optional products;
- applicable incentives; and
- unresolved items.

## 4.5 Appointment readiness

Before the customer leaves home:

- verify the exact unit is available;
- verify price/status;
- stage the vehicle;
- confirm appointment time;
- tell the customer what to bring;
- estimate realistic appointment duration; and
- identify the direct contact.

## 4.6 Delivery orientation

At delivery:

- pair the phone;
- configure basic driver/safety preferences;
- explain important controls;
- confirm paperwork/questions;
- schedule or explain first service;
- provide direct contact details; and
- capture a customer-approved delivery photo/story when appropriate.

## 4.7 Follow-through

- delivery-day thank-you;
- 72-hour check-in;
- 30-day check-in;
- service handoff;
- honest review request; and
- long-term permission-based relationship nurture.

## 4.8 Memorable ritual

Carter Chevrolet has a memorable country-store/chicken-dinner identity. NorAuto Match needs a repeatable ritual that belongs to the brand.

Proposed ritual: **The NorAuto Delivery Brief**

- personalized delivery photo/video;
- one-page “what you bought” summary;
- paired phone and safety settings;
- first-service reminder;
- direct-line card; and
- 72-hour follow-up.

---

# 5. Customer segments and jobs to be done

## 5.1 Payment-led shopper

**Job:** “Help me understand what realistically fits without embarrassing me or wasting my Saturday.”

Needs:

- monthly target;
- down/trade equity;
- term;
- realistic estimated buying power;
- body-style options; and
- clear disclaimer that the estimate is not approval.

## 5.2 Exact-vehicle shopper

**Job:** “Find the exact model/spec and tell me what is actually available before I drive.”

Needs:

- exact model/trim/color;
- acceptable alternatives;
- actual-unit proof;
- availability confirmation; and
- approved sourcing if unavailable.

## 5.3 Busy or dealership-averse shopper

**Job:** “Give me one person and a clear sequence.”

Needs:

- direct communication;
- time certainty;
- video;
- simple process; and
- no generic lead queue.

## 5.4 Truck/use-case shopper

**Job:** “Match the truck to the actual job.”

Needs:

- towing weight;
- payload/use;
- cab/bed configuration;
- drivetrain;
- commute/fuel tradeoffs;
- family needs; and
- realistic payment band.

## 5.5 Trade-sensitive shopper

**Job:** “Show me how my trade changes the deal without pretending an estimate is final.”

Needs:

- year/make/model;
- mileage;
- payoff estimate;
- condition context;
- appraisal appointment; and
- written assumptions.

---

# 6. Current website prototype

## 6.1 Technology

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Zod validation
- React Hook Form
- Lucide icons
- React Markdown for internal documents

## 6.2 Current routes

- `/`
- `/how-it-works`
- `/areas/[slug]` for eight service areas
- `/privacy`
- `/playbook` — noindex
- `/master-build-prompt` — noindex, readable handoff
- `/master-build-prompt/download`
- `/api/leads`
- `/robots.txt`
- `/sitemap.xml`

## 6.3 Homepage experience

The current homepage includes:

- NorAuto Match at Orr Nissan West branding;
- primary hero promise;
- direct call/text CTAs;
- payment-first proof points;
- Interactive Matcher tab;
- Traditional Browse tab;
- NorAuto Standard section;
- four-step process;
- final CTA; and
- dealership attribution and compliance footer.

## 6.4 Interactive Matcher

Current controls:

- monthly payment: $300–$1,000, default $600;
- down/trade equity: $0–$15,000, default $5,000;
- term: 36, 48, 60, 72 months;
- assumed APR: 7%;
- brand filters;
- body-style filters.

Reverse-amortization logic:

```text
monthly_rate = annual_rate / 12
financed_amount = monthly_payment * (1 - (1 + monthly_rate)^(-term_months)) / monthly_rate
estimated_buying_power = financed_amount + down_payment_or_equity
```

The calculator must remain an estimate—not an approval or final advertised payment.

## 6.5 Swipe and persistent feed

- Pass dims a vehicle.
- Shortlist gives a persistent green state.
- Budget and filters dim excluded vehicles.
- Master feed remains visible so the shopper understands what changed.
- Gesture alternatives exist through buttons and must remain keyboard accessible.

## 6.6 Vehicle Sourcing route

When no active matches remain, the site does not dead-end. It displays a concierge-style Vehicle Sourcing CTA.

Approved concept:

> Out of stock on our lot, but not out of luck. I will use Orr Nissan West and its approved inventory channels to source the right vehicle, explain the available deal structure, and coordinate the next step.

CTA: **Let Me Work For You**

## 6.7 Traditional Browse

The alternative tab provides a familiar browse path and a permanent sourcing banner for shoppers who do not want the matcher.

## 6.8 Lead form

Current prototype collects:

- first name;
- last name;
- email;
- phone;
- budget range;
- payment method;
- trade details;
- notes;
- explicit contact consent;
- pipeline context;
- shortlist context;
- matcher values.

Production recommendation: make this progressive rather than opening with every field.

## 6.9 Current lead API

- server-side schema validation;
- rate limiting;
- `Standard Retail` vs `Vehicle Sourcing` pipeline;
- optional `CRM_WEBHOOK_URL` forwarding;
- production failure response when CRM is not configured;
- no repository or ordinary log storage of lead PII.

## 6.10 Demonstration-content warning

The current six-vehicle array and AI-generated vehicle images are representative demonstration content. They are not live inventory and must be replaced before production.

Current representative vehicles:

- Nissan Rogue
- Toyota RAV4
- Honda Accord
- Nissan Frontier
- Toyota Tacoma
- Nissan Pathfinder

---

# 7. Website production backlog

Build in this order:

1. `/match-brief`
2. `/why-norauto`
3. `/reviews`
4. `/guides/car-payment-buying-power-okc`
5. `/guides/best-family-suvs-okc`
6. `/guides/best-trucks-oklahoma`
7. `/contact`
8. `/thank-you/retail` — noindex
9. `/thank-you/sourcing` — noindex
10. approved live VDP/inventory integration

Every indexable page must serve a distinct customer/search intent. Do not generate hundreds of doorway pages by swapping city and model names.

## 7.1 Performance targets

- WCAG 2.2 AA
- Lighthouse mobile Performance 90+
- Accessibility 95+
- SEO 95+
- LCP under 2.5 seconds
- CLS under 0.1
- INP under 200 milliseconds

## 7.2 Required production integrations

- production domain;
- live approved inventory feed;
- CRM webhook/API;
- SMS/email provider;
- appointment calendar;
- Analytics;
- Search Console;
- Google Ads conversion IDs;
- Meta Pixel/CAPI if used;
- call tracking decision; and
- dealer CRM/DMS connection where approved.

---

# 8. CRM architecture

## 8.1 Principle

The sales process defines the CRM. Do not let HubSpot, Salesforce, ActiveCampaign, VinSolutions, DealerSocket, or another platform's defaults define the operating model.

## 8.2 Core objects

### Contact

One person record per customer.

Key fields:

- normalized phone;
- normalized email;
- city/ZIP;
- preferred channel/time;
- consent status/timestamps/version;
- first-touch attribution;
- latest-touch attribution;
- owner;
- communication opt-outs; and
- deletion status.

### Opportunity / Vehicle Request

A contact can have multiple requests over time.

Key fields:

- pipeline/stage/status;
- owner;
- source/trigger;
- purchase timing;
- payment/cash lane;
- down/equity;
- term;
- vehicle preferences;
- must-haves;
- shortlist/VINs;
- trade context;
- appointment/show/desking status;
- sold VIN/date;
- lost reason;
- next action/date.

### Vehicle

Cross-system key should be VIN or an approved stable vehicle identifier.

### Activity

- call;
- SMS;
- email;
- note;
- actual-unit video;
- Match Brief;
- appointment;
- showroom visit;
- task;
- stage/consent change;
- delivery follow-up;
- review request.

## 8.3 Pipeline A — Standard Retail

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

## 8.4 Pipeline B — Vehicle Sourcing

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

Do not create separate contact records for the two pipelines.

## 8.5 Deduplication

- Normalize phone to E.164.
- Normalize email safely.
- Exact phone first, then exact email.
- Do not auto-merge people because they share a household/address.
- Preserve original submission IDs and attribution.
- New buying cycle creates a new opportunity, not a replacement of history.

## 8.6 Default ownership

Default owner should be the approved NorAuto Match salesperson unless documented dealership policy requires reassignment.

Every routing decision must be auditable.

## 8.7 Speed-to-lead

During posted hours:

- 0 minutes: ingest, dedupe, assign, confirm, alert;
- 5 minutes: internal reminder if no human activity;
- 15 minutes: internal escalation under approved policy;
- 2 hours: second-attempt task;
- end of day: next-business-day queue.

Outside posted hours:

- send an honest automated receipt;
- state when a human will respond;
- create an opening-time task;
- do not pretend automation is a live human.

## 8.8 Contact cadence

- immediate confirmation;
- human attempt within SLA;
- 2-hour value-based follow-up;
- next business morning;
- day 3 useful message;
- day 7 option/guide;
- day 14 close-the-loop;
- permission-based nurture only thereafter.

Avoid repetitive “still interested?” messages.

## 8.9 Appointment automation

At appointment creation:

- verify vehicle;
- stage vehicle;
- create actual-unit video task;
- send calendar confirmation;
- include address, direct line, duration, and what to bring.

Reminders:

- immediately;
- 24 hours;
- 2 hours.

No-show:

- internal alert after 15 minutes;
- respectful recovery message;
- next-morning task;
- record reason if known.

## 8.10 Sold and delivery lifecycle

At sold:

- require VIN/stock;
- preserve attribution;
- record sale date;
- create delivery checklist.

At delivered:

- thank-you;
- 72-hour check-in;
- 30-day check-in;
- service introduction;
- honest review request; and
- no review gating.

## 8.11 Lost reasons

Controlled options:

- could not contact;
- timing/not ready;
- payment outside feasible range;
- financing not completed—no sensitive detail;
- trade gap;
- vehicle unavailable;
- wrong fit;
- purchased elsewhere;
- price/deal structure;
- distance/logistics;
- duplicate/test/spam;
- opted out;
- other.

---

# 9. Data, attribution, and analytics

## 9.1 Attribution fields

Store first touch and latest touch separately:

- source;
- medium;
- campaign;
- content;
- term;
- GCLID;
- GBRAID;
- WBRAID;
- FBCLID;
- landing page;
- referrer;
- submission ID;
- approved session ID.

Never overwrite first touch.

## 9.2 Event contract

- `matcher_started`
- `buying_power_changed`
- `vehicle_viewed`
- `vehicle_passed`
- `vehicle_shortlisted`
- `trapdoor_viewed`
- `traditional_browse_opened`
- `lead_form_opened`
- `lead_form_step_completed`
- `lead_submitted`
- `phone_clicked`
- `text_clicked`
- `appointment_requested`

Do not change names independently in Website, CRM, Ads, or Analytics.

## 9.3 PII rule

Do not send the following to Analytics or ad pixels:

- name;
- email;
- phone;
- detailed ZIP/location that identifies a person;
- trade notes;
- free text;
- consent text;
- credit information.

## 9.4 Offline conversion loop

Where consent and platform policies allow, send approved sold/qualified outcomes back to ad platforms using approved hashed identifiers. Do not export unnecessary customer details.

---

# 10. Competitive research synthesis

## 10.1 Core market truth

NorAuto Match cannot beat major rooftops on raw inventory, OEM authority, service capacity, or statewide ad spend. It can beat them at customer continuity and decision support.

## 10.2 Strongest lessons

### Carter Chevrolet, Okarche

Borrow:

- low-pressure identity;
- memorable ritual;
- country-store personality;
- fast transaction stories;
- referral-worthy experience.

### Eskridge Lexus and Porsche Oklahoma City

Borrow:

- named advisor continuity;
- actual inspection/video communication;
- customer expectedness;
- delivery orientation;
- after-sale relationship.

### Jim Glover Chevrolet and Stuteville CDJR

Borrow:

- strong price-transparency story;
- proof at scale;
- clear offer presentation;
- written deal context.

### Ferguson Superstore

Borrow:

- multi-brand breadth;
- remote paperwork;
- delivery coordination;
- large review engine.

### Jackie Cooper Nissan/BMW

Borrow:

- employee-level reputation;
- named salesperson proof;
- remote video sales;
- repeat/referral focus.

### Major metro stores generally

Exploit the recurring gaps ethically:

- slow or missing callbacks;
- generic lead queues;
- unclear price assumptions;
- vehicle unavailable after the drive;
- finance/process delays;
- inconsistent after-sale follow-through;
- copy-paste videos;
- customer not knowing who owns the next step.

Do not publicly weaponize isolated negative reviews. Build the process that prevents the category's common failures.

## 10.3 Geography

Study Tulsa, Poteau, Ardmore, Lawton, and rural leaders for playbooks. Do not spend paid media there before dense execution works in the OKC/Yukon/Edmond/Mustang/Piedmont core.

## 10.4 Ranking caution

The supplied “#1” dealer claims were not auditable sales-volume rankings. Review counts, inventory counts, manufacturer awards, Google ratings, and third-party quote samples measure different things.

Do not publish “#1 salesperson” until a defined metric, geography, and period support it.

---

# 11. SEO strategy

## 11.1 Realistic search lane

Do not chase broad terms such as:

- car;
- used cars;
- Nissan;
- Nissan dealer Oklahoma City.

Own narrower, commercial-intent terms:

- cars by monthly payment Oklahoma City;
- car finder Oklahoma City;
- personal car shopper OKC;
- cars under $500 a month OKC;
- help finding a car Oklahoma City;
- family SUV Mustang OK;
- truck finder Yukon OK;
- car delivery Piedmont OK.

## 11.2 Content clusters

1. Payment and buying power
2. Family SUV fit
3. Truck use cases
4. Trade/equity education
5. Vehicle sourcing and exact-spec search
6. City/service-area guides
7. Honest car-buying process education
8. Delivery/customer proof

## 11.3 Technical SEO

- one canonical HTTPS origin;
- server-rendered core content;
- unique titles/H1/descriptions;
- canonical URLs;
- XML sitemap;
- robots controls;
- breadcrumbs;
- accurate structured data tied to Orr Nissan West;
- 404/410 behavior for removed pages;
- redirect map;
- noindex internal playbooks, thank-you pages, and handoff docs;
- Search Console at launch.

## 11.4 What SEO must not do

- create a separate dealership identity;
- create a salesperson GBP;
- change CRM/event definitions;
- generate doorway pages;
- make unsupported ranking claims;
- copy manufacturer/dealer content at scale.

---

# 12. Advertising strategy

## 12.1 Sequence

1. Validate routing and response organically.
2. Launch controlled high-intent Search.
3. Add retargeting/content promotion.
4. Add inventory ads only after the approved feed is accurate.

## 12.2 Search Ads

Run through the approved dealership advertising structure with Orr Nissan West identified.

Launch with:

- exact/phrase match;
- 25–35 mile presence targeting;
- payment, personal-shopping, sourcing, city/use-case intent;
- completed lead as primary conversion;
- phone/text as secondary conversions;
- aggressive negative keyword management.

Do not bid competitor dealership names in phase one.

## 12.3 Negative keyword starter set

- repair;
- parts;
- oil change;
- jobs;
- rental;
- manual;
- insurance;
- wholesale;
- auction;
- free;
- credit repair;
- broad dealership-navigation terms not relevant to the offer.

## 12.4 Meta and social

- Use approved lead/content ads.
- Use Automotive Inventory Ads only through eligible dealer assets/feed.
- Do not create dummy personal Marketplace accounts.
- Do not post down-payment-only bait listings.
- Use customer-approved video, actual units, and educational content.

## 12.5 Google Vehicle Ads

Vehicle Ads should run through the eligible dealership/retailer structure, approved Merchant Center, accurate inventory feed, verified location, and exact VDPs.

## 12.6 What Ads must not do

- competitor impersonation;
- unapproved competitor-name conquest;
- unsupported price/payment claims;
- PII in pixels;
- stale inventory;
- changing source field/event names;
- optimization toward cheap junk leads rather than qualified/show/sold outcomes.

---

# 13. Content engine

Publish five useful short-form pieces per week.

## 13.1 Repeatable franchises

### Payment Match Monday

One budget, three realistic body styles/options, clear assumptions.

### Deal Decoder

Explain:

- selling price;
- taxes/title/license;
- trade equity;
- term;
- APR;
- optional products;
- why two “same payment” deals can be radically different.

### Truck Fit Friday

Explain towing, payload, cab/bed, 4x4, fuel, commute, and family tradeoffs.

### Video Before the Drive

Real walkaround of the exact approved unit.

### What I Would Buy

Direct recommendation for a specific buyer job:

- new family;
- long commute;
- first-time buyer;
- three-row need;
- work truck;
- under a specific realistic price band.

### Delivery Proof

Customer-approved delivery story, what they needed, and how the match was made.

## 13.2 Content principle

Every piece should do one of four jobs:

1. educate;
2. reduce uncertainty;
3. prove the process;
4. create a direct conversation.

---

# 14. Review and referral engine

## 14.1 Reviews

Ask every eligible delivered customer for an honest review using the same neutral process.

Do not:

- ask only happy customers;
- require five stars;
- filter negative sentiment away from public review options;
- offer an incentive for a positive review;
- fabricate testimonials.

Because a separate salesperson GBP is not recommended, reviews should live on eligible dealership/platform profiles and naturally mention the salesperson or NorAuto Match where permitted.

## 14.2 Referrals

Do not introduce paid customer referral schemes until dealership compliance confirms they are allowed and properly structured. Oklahoma licensing/employment rules restrict certain compensated referral behavior.

A safe early referral engine is experience-driven:

- direct follow-through;
- easy share link;
- customer-approved delivery story;
- “send me the person who hates car shopping” message;
- no unapproved cash promise.

---

# 15. Internal scoreboard

“Number one” must be operational, not decorative.

| Metric | Day 30 | Day 60 | Day 90 |
|---|---:|---:|---:|
| Median first response | <10 min | <7 min | <5 min |
| Direct qualified leads/month | 20 | 40 | 60 |
| Match Briefs completed | 12 | 25 | 40 |
| Appointment set rate | 40% | 45% | 50% |
| Show rate | 65% | 70% | 75% |
| Close rate from shows | Baseline | +10% | +20% |
| Eligible buyers asked for review | 100% | 100% | 100% |
| Customer-approved delivery stories | 4 | 8 | 12 |
| Content pieces/week | 5 | 5 | 5 |

Additional quality metrics:

- lead routing success: 100%;
- duplicate rate: under 2%;
- inventory freshness: under 24 hours, preferred under 4;
- paid attribution completeness: 95%+;
- form delivery failure: under 0.5%;
- actual-unit video rate;
- 72-hour follow-up completion;
- 30-day follow-up completion.

Do not publish internal targets as guarantees.

---

# 16. Team operating model

## 16.1 Founder/business owner

Owns:

- final business approval;
- dealership relationship;
- account access;
- production budget;
- operating response commitment;
- public identity/headshot;
- final acceptance.

## 16.2 Growth/Systems owner — Mark

Owns:

- offer;
- positioning;
- funnel;
- Website–CRM architecture;
- pipeline vocabulary;
- event taxonomy;
- attribution;
- experiment prioritization;
- cross-team acceptance criteria;
- preventing strategy drift.

## 16.3 Website team

Owns:

- UX/UI;
- production code;
- performance/accessibility;
- inventory integration;
- lead API;
- analytics data layer;
- SEO technical implementation;
- deployment/rollback.

Does not own redefining the offer or pipelines.

## 16.4 CRM team

Owns:

- objects/fields;
- pipelines;
- deduplication;
- routing;
- automations;
- consent/opt-out propagation;
- dashboards;
- data governance;
- website/dealer-system integrations.

Does not own redefining the customer journey based on vendor defaults.

## 16.5 SEO team

Owns:

- keyword/intent validation;
- content briefs;
- internal linking;
- metadata;
- schema QA;
- indexation/crawl QA;
- Search Console.

## 16.6 Advertising team

Owns:

- channel plan;
- keywords/audiences;
- creative tests;
- campaign-to-landing-page mapping;
- bidding/budgets;
- conversion configuration;
- offline conversion optimization.

## 16.7 Change-control rule

Any team requesting a change to a non-negotiable must state:

1. proposed change;
2. reason;
3. conversion impact;
4. data impact;
5. compliance impact;
6. impact on other teams;
7. acceptance-test change.

---

# 17. Correct execution sequence

1. Approve positioning, attribution, compliance, and data contracts.
2. Website and CRM teams return architecture proposals.
3. Approve sitemap and CRM object/pipeline design.
4. SEO validates information architecture and briefs.
5. Website and CRM build in parallel.
6. Complete shared integration and acceptance tests.
7. Ads validates landing pages, events, and offline outcomes.
8. Soft launch with direct/organic traffic.
9. Verify routing, response, appointments, and reporting on real leads.
10. Start controlled Search ads.
11. Add inventory ads only after feed accuracy and eligibility are proven.

Forward planning is correct. What would be premature is polishing dozens of pages, buying broad traffic, or configuring a CRM before the shared data model is accepted.

---

# 18. Production decisions still required

- [ ] Production domain
- [ ] Brand email
- [ ] Public display name
- [ ] Approved headshot
- [ ] Posted response hours
- [ ] CRM platform
- [ ] SMS/email provider
- [ ] Sending number/domain strategy
- [ ] Calendar system
- [ ] Approved live inventory source/feed
- [ ] Dealer CRM/DMS integration requirements
- [ ] CRM webhook/API credentials
- [ ] Analytics IDs
- [ ] Google Ads account/conversion IDs
- [ ] Meta account/pixel/CAPI IDs
- [ ] Call-tracking decision
- [ ] Final consent language
- [ ] Data-retention period
- [ ] Roles/permissions
- [ ] Written approval scope archived
- [ ] Production pricing/payment compliance review

These decisions do not block architecture. They block final production configuration and launch.

---

# 19. Current GitHub and handoff status

**Repository:** https://github.com/norrijam405/NorAutoMatch  
**Development branch:** `arena/01a00129-norautomatch`  
**Pull request:** https://github.com/norrijam405/NorAutoMatch/pull/1  
**AI handoff issue:** https://github.com/norrijam405/NorAutoMatch/issues/2

Important: until Pull Request #1 is merged, `main` may not show the complete implementation. AI agents and developers must use the PR/branch or import the PR changes into their permitted branch.

## 19.1 Source documents

- `MASTER_GROWTH_SYSTEM_BUILD_PROMPT.md` — exact Website + CRM specification
- `COMPETITIVE_GROWTH_PLAN.md` — complete Oklahoma competitor research
- `DEVELOPER_HANDOFF.md` — implementation and production checklist
- `NORAUTO_MATCH_COMPLETE_BRAIN_DUMP.md` — this group-ready synthesis
- `README.md` — setup and repository overview

## 19.2 Internal browser documents

- `/playbook`
- `/master-build-prompt`
- `/master-build-prompt/download`
- `/brain-dump` once deployed from this branch

All internal documents should remain noindex. Access control should be considered for production.

---

# 20. Current validation baseline

The website branch has passed:

- ESLint;
- TypeScript;
- Next.js production build;
- npm audit with zero known vulnerabilities;
- homepage smoke test;
- service-area page smoke test;
- sitemap smoke test;
- Standard Retail and Vehicle Sourcing API validation;
- master prompt browser rendering;
- Markdown download route.

Production readiness is still blocked by live integrations and decisions listed above.

---

# 21. Non-negotiable “do not” list

- Do not mix this project with IGNICheck.
- Do not present NorAuto Match as a separate dealership.
- Do not present the operator as an independent auto broker unless the business and license genuinely change.
- Do not create a separate salesperson Google Business Profile.
- Do not omit Orr Nissan West from vehicle advertising.
- Do not scrape competitor customer lists.
- Do not impersonate competitors.
- Do not solicit protected leads from another dealer.
- Do not use isolated negative reviews as attack ads.
- Do not bid broad “car” terms at launch.
- Do not bid competitor dealer names in phase one.
- Do not post fake/dummy Marketplace inventory.
- Do not advertise only a down payment as price.
- Do not show representative demo inventory as live.
- Do not leave sold inventory active.
- Do not publish specific payments without approved disclosures.
- Do not claim guaranteed approval.
- Do not claim “#1” without substantiation.
- Do not send PII into analytics or advertising pixels.
- Do not store sensitive credit/identity documents on the public site.
- Do not let each team invent its own pipeline or event vocabulary.
- Do not replace the experience with an Orr inventory iframe.

---

# 22. Immediate operating plan

## Next 72 hours

1. Confirm status of any NorAuto Match Google Business Profile.
2. Archive written GM approval and clarify exact scope.
3. Share the Master Build Prompt and this Brain Dump with the group.
4. Select the CRM platform or narrow to two candidates.
5. Identify the approved inventory-feed source.
6. Confirm public display name, headshot, email, and response hours.
7. Require Website and CRM teams to return architecture proposals before production work.

## Next 14 days

1. Run the NorAuto Standard manually on 20 qualified leads.
2. Measure first response, qualification, appointments, shows, and sales.
3. Send actual-unit videos for qualified appointments.
4. Use a consistent written Match Brief.
5. Ask every eligible delivered customer for an honest review.
6. Publish five content pieces per week.
7. Test both CRM pipelines end to end in a sandbox.

## Days 15–30

1. Finish production website and CRM integration.
2. Replace representative inventory/images.
3. Complete acceptance tests.
4. Soft launch with direct/organic traffic.
5. Verify reporting and follow-up.
6. Prepare controlled Search campaign.

## Days 31–90

1. Launch high-intent Search.
2. Improve landing pages from qualified/sold data.
3. Add approved content/retargeting.
4. Activate dealer inventory ads after feed validation.
5. Build reviews and delivery proof.
6. Expand content and city pages only when original demand/data justify them.

---

# 23. Questions for the managed group

The group should resolve these in order:

1. What exact scope does written dealership approval cover?
2. What CRM/DMS must NorAuto Match integrate with?
3. Who legally owns and can export first-party customer data?
4. What is the approved inventory feed?
5. What hours can the operator maintain the response SLA?
6. Which pipeline stages must synchronize with dealership systems?
7. Which messaging provider and number will be used?
8. What is the final domain?
9. What content/review permissions exist?
10. What budget is approved for the first 30-day paid test?
11. Who approves vehicle price/payment advertising?
12. Who owns production access, security, and rollback?

Do not let the group begin with colors, logos, or ad creative. Resolve ownership, data, integrations, compliance, and customer process first.

---

# 24. Final strategic position

NorAuto Match does not win by becoming a smaller version of a dealership website. It wins by becoming the trusted human operating layer in front of approved dealership inventory and process.

The final system is:

> **Useful search experience + one accountable salesperson + clean CRM context + fast follow-up + appointment readiness + delivery ritual + measurable proof.**

The play is not dirtier competitive marketing. It is a cleaner, more personal, more measurable operating system.
