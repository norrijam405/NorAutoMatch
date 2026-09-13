# NorAutoMatch Canonical Design Brief

Status: Canonical visual/product direction for customer-facing prototype work.
Date: 2026-09-13

## Product identity

**NorAuto Match**

**CAR SHOPPING, WITHOUT THE PRESSURE**

NorAuto Match is an independent vehicle-matching and car-shopping product. It should help a shopper figure out what fits them, understand the numbers, compare choices, build a shortlist, and then connect with verified inventory.

This is **not** a dealership website and should not look or feel like one.

The customer should move through this emotional sequence:

> This looks legitimate. → This feels easier. → Oh shit, I can interact with this. → It is learning what I like. → Now I understand my choices. → I know what to do next.

## Core design objective

The current production prototype proved the visual language but also exposed two problems:

1. **Visual fatigue** — too many cards, borders, labels, large text blocks, and sections carrying equal visual weight.
2. **Weak information hierarchy** — important information can feel easy to miss because the page does not always make the next priority obvious.

The redesign must deliberately solve both.

At any point in the journey, a shopper should be able to answer three questions almost instantly:

- Where am I?
- What did NorAuto Match learn about me?
- What should I do next?

Use whitespace, scale, contrast, pacing, motion, and progressive disclosure so the user always knows what deserves attention next.

## Visual language

Target feeling:

- premium automotive editorial
- modern consumer technology
- calm confidence
- personal buying assistant
- slightly playful/product-led
- never childish
- never aggressive dealership marketing
- never generic marketplace clutter

Visual direction:

- near-black / deep navy base
- warm white typography
- restrained amber/gold primary accent
- small emerald accents only for positive verified/live states
- cinematic automotive imagery
- generous negative space
- large confident headlines
- subtle gradients, depth, glass, and texture
- restrained motion
- no red sale/dealership aesthetic
- no fake urgency
- no giant discount stickers
- no casino/game-show treatment

## Brand and source boundary

The ordinary customer experience is **NorAuto Match-first**.

Do not routinely expose the inventory-source dealership, provider, dealer ID, feed vendor, or source plumbing.

Do not write dealership-facing copy such as:

- Orr Nissan West
- Orr inventory
- Nissan dealership inventory

Acceptable customer-facing language includes:

- Verified inventory
- Verified match
- Available matches
- Fresh inventory is being verified
- No verified inventory match right now
- Find something similar
- Request a test drive
- Send my Buyer Brief

Exact source provenance remains a backend requirement and may be disclosed when required for the actual visit, transaction, authorized handoff, or legal/compliance reason.

## Truth rules

Do not invent claims such as:

- live inventory updated in real time
- vehicle available now
- price dropped today
- appointment confirmed
- reserved for you
- financing approved
- dealer approved

Demo content may be used to demonstrate layout and interaction, but it must be clearly replaceable with backend data and must not be represented as verified current inventory.

When verified inventory is temporarily unavailable, use a small elegant state rather than a giant failure panel.

Example:

**Fresh inventory is being verified.**

We’re checking the latest vehicle data before showing it here.

Primary action: **Keep building my match**

## Journey architecture

The site should feel like one guided shopping product, not stacked webpage sections.

The mental model is:

**DISCOVER → SHORTLIST → COMPARE → UNDERSTAND → DECIDE → ACT**

This progression may appear subtly in the UI but should never become a giant intrusive stepper.

### 1. Header

- NorAuto Match wordmark/logo
- Small tagline: **CAR SHOPPING, WITHOUT THE PRESSURE**
- Desktop navigation may include Find My Match, Garage, Compare, How It Works
- Mobile header must stay compact
- Do not immediately repeat the tagline below the header

### 2. Hero

Primary headline:

**Tell me\nthe number.**

Emphasize **number.** with amber/gold.

Supporting message: start with the shopper’s comfortable financial lane and what the vehicle actually needs to do, then narrow the noise into realistic choices.

Primary CTA: **Find My Match**
Secondary CTA: **Browse Cars**
Optional lightweight tertiary action: text / ask for help

Use one excellent cinematic vehicle image. Do not let the mobile hero become overly tall.

### 3. SwipeMatch / Discover Your Match

This is the signature interaction: sophisticated “Tinder for cars,” not a dating-app parody.

Each card should communicate enough to make a fast intuitive judgment:

- photo
- year / make / model
- body style
- approximate price/payment context when legitimate
- seating
- fuel economy or EV range where relevant
- drivetrain
- 2–4 useful traits

Actions:

- Like / swipe right
- Pass / swipe left
- optional wildcard/interesting action
- accessible buttons in addition to gestures

After roughly 5–8 choices in the prototype, visually begin forming the user’s preference profile.

### 4. Match DNA

This is the payoff for interaction.

Potential dimensions:

- SUV leaning
- AWD preference
- family utility
- technology
- cargo
- fuel economy
- performance
- payment sensitivity

Explain **why** a recommendation fits.

Example:

> You consistently favored midsize SUVs, AWD, strong cargo space, and payments below your target.

Then surface a small set of recommended vehicle families.

### 5. My Garage

Cars the shopper liked become a saved shortlist.

Actions:

- Compare
- Remove
- View match reason
- Add another

Use a horizontal shelf/rail on mobile. Do not require contact information merely to use the prototype experience.

### 6. Garage Battle / Head-to-head

Make comparison useful and enjoyable.

Do not declare a universal winner. Instead explain what is better **for this shopper**.

Potential dimensions:

- Family Fit
- Value
- Fuel Cost
- Cargo
- Technology
- Performance
- Ownership Cost
- Reliability evidence
- Verified availability when real data exists

Plain-English differences first; technical details may be expandable.

### 7. Understand the Money

Return to the core promise: **Tell me the number.**

Inputs may include:

- target payment
- down payment
- trade equity
- loan term

Do not frame estimates as financing approval. Show how the financial lane changes the recommendation set.

### 8. Verified Inventory

Inventory appears after the product has already given the customer value.

Possible headings:

- Matches You Can Actually Shop
- Verified Matches
- Available Matches

Real backend inventory may eventually supply:

- photo
- VIN
- stock number
- price
- mileage
- trim
- drivetrain
- colors
- vehicle URL
- availability/freshness timestamp

If there is no verified match, show a compact state with useful next steps:

- Keep my preferences
- Find something similar
- Request help finding one

Never fake availability.

### 9. Action / lead doors

Utility before contact capture.

Potential actions:

- Request a Test Drive
- Send My Buyer Brief
- Find One for Me
- Save My Match
- Price Watch only when real monitoring exists

Do not force a generic lead form before the shopper receives value.

### 10. NorAuto Standard / trust

Keep this concise.

Useful themes:

- a real match brief
- actual vehicle details before the drive
- numbers with context
- follow-through

Possible emotional line:

**Country-store humanity. Luxury-level follow-through.**

Mobile should use a compact rail or 2x2 treatment, not four giant stacked cards.

### 11. How It Works

Compress into a visual explanation:

1. Tell us your lane
2. Discover what fits
3. Build your Garage
4. Compare intelligently
5. Check verified matches
6. Take the next step

Avoid another wall of text.

### 12. Final CTA

Possible headline:

**Still looking at 14 tabs?**

Supporting idea: tell NorAuto Match what matters and turn the search into a shortlist.

Primary CTA: **Find My Match**
Secondary CTA: **Browse Cars**

## Mobile-first requirements

Primary reference viewport: **390 × 844**

Also support approximately 360, 412, and 430px widths.

The mobile experience must be intentionally designed, not merely desktop stacked vertically.

Principles:

- compact header
- reduced hero height
- thumb-friendly controls
- minimum 44px touch targets
- horizontal rails instead of repetitive stacked-card walls
- swipe gestures where useful
- progressive disclosure
- shorter copy
- strong visual payoff early
- no accidental page overflow
- readable without zooming
- safe-area awareness
- first few screens should feel interactive

A customer should not scroll through five informational sections before doing something.

## Desktop requirements

Primary reference width: **1440px**

Desktop should feel more cinematic and editorial rather than simply stretching mobile.

Possible composition:

- Hero: copy left, cinematic vehicle visual right/background
- SwipeMatch: large central vehicle card with contextual information
- Match DNA: visual preference dashboard/constellation
- Garage: wide vehicle shelf
- Comparison: split-screen head-to-head
- Money: controls on one side, recommendation impact on the other
- Inventory: clean premium grid

Use whitespace and scale. Avoid dashboard overload.

## Motion and microinteractions

Use restrained motion:

- card swipes
- preference chips appearing
- Match DNA progressively forming
- Garage card transitions
- comparison highlight changes
- soft verified-state glow
- tactile button feedback

No confetti, slot-machine effects, constant pulsing, or excessive parallax.

## Conversion philosophy

**UTILITY BEFORE CONTACT CAPTURE**

Sequence:

> Help me → understand me → show me good options → ask whether I want help taking the next step.

## Prototype technical contract

Preferred stack:

- Next.js
- React
- TypeScript
- Tailwind CSS

Keep data/content separated from presentation so the real backend can replace demo state cleanly.

Recommended reusable components:

- VehicleCard
- SwipeMatch
- MatchDNA
- Garage
- Comparison
- PaymentLane
- InventorySection
- LeadActionCard
- InventoryUnavailableState

Do not build a fake backend or invent external API integrations. Use local prototype state where needed and clearly mark demo data.

## Required deliverables from a design/build agent

1. Complete responsive homepage
2. Purpose-designed mobile layout
3. Purpose-designed desktop layout
4. Functional prototype interactions for SwipeMatch, Garage, and comparison
5. Clean component architecture
6. Short README explaining the design system, journey, responsive behavior, backend integration points, lead API integration points, and all placeholder/demo content
7. Preview/screenshots at 390px mobile and 1440px desktop

## Integration boundary for the next NorAutoMatch worker

The prototype designer owns presentation, interaction hierarchy, responsiveness, motion, and demo state.

The NorAutoMatch implementation worker owns:

- authorized live inventory
- provider abstraction
- provenance
- truth states
- source-neutral customer presentation
- `/api/leads`
- CRM integration
- Buyer Brief
- test-drive request flow
- Garage persistence
- referral/sourcing authorization
- customer consent
- security
- removal/replacement of fake/demo state

## Final design test

Before accepting a prototype, ask:

- Does it feel calm rather than visually exhausting?
- Is the most important thing on each screen obvious?
- Does the user always know what they learned and what to do next?
- Does mobile feel designed rather than stacked?
- Does desktop feel cinematic without becoming a dashboard?
- Does the product provide value before asking for contact information?
- Does the experience remain NorAuto Match-first rather than dealership-first?
- Can demo UI be cleanly wired to real backend data without redesigning the experience?

The central concept must remain:

**NORAuto Match**

**CAR SHOPPING, WITHOUT THE PRESSURE**

**Find the car that fits the person first. Inventory comes after understanding what they actually need.**
