# NorAutoMatch R2 Customer Workspace Reconciliation — 2026-10-04

## Purpose

Prevent duplicate product work before adding customer-facing Torque, secure document exchange, trade-offer intake, and a centralized video hub.

## Existing capability that must be reused

Current canonical NorAutoMatch already contains:
- persistent CRM lead/opportunity intake
- `NORAUTO_DESK_PREP_V1`
- manager handoff/review boundaries
- conversation gateway + durable conversation events
- response preparation/evidence requirements
- manager conversation response desk
- follow-up/customer commitment logic
- Torque Green Room qualification and independent assurance
- Supabase auth/membership boundaries

Historical NorAutoMatch product direction already defined:
- lead -> BDC -> needs analysis -> inventory match -> trade -> deal prep -> manager review -> finance -> contract/compliance -> delivery -> funding/title
- Trade Evidence Specialist
- Desk-Prep Assistant
- F&I Documentation Assistant
- Follow-Up Specialist
- Compliance / Delivery Checker

Therefore do **not** build a second CRM, second deal-jacket system, second manager queue, or second agent framework.

## Orr website observations from founder-supplied HAR/video

Observed dealership identity:
- dealer id: 2175
- dealer domain: `orrnissanwest.com`

Observed chat transport:
- LangGraph thread creation with dealer metadata
- streamed runs using graph id `consumer_chat_graph`
- input includes customer message, dealer id/domain, and optional vehicle id

Observed lead handoff:
- RideMotive lead endpoint returns both a conversation id and lead id

Observed trade flow:
- RideMotive taxonomy lookup drives make/year/model/trim/drivetrain/engine choices
- trade submission returns a trade lead record plus estimated value
- trade valuation remains external/dealership evidence, not NorAutoMatch-created truth

Observed credit path:
- public credit application provider resolves to `dealer_track`
- supplied capture does **not** prove an authorized Dealertrack submission API for NorAutoMatch

## Build decision

Extend the existing NorAutoMatch operating model with three bounded modules:

1. **Orr Conversation Bridge Contract**
   - normalize authorized Orr/RideMotive/ChatAgent events into the existing NorAutoMatch conversation gateway
   - no scraping/hijacking of private endpoints
   - no live network authority in this foundation

2. **Secure Customer Document Contract**
   - customer uploads happen outside normal chat text
   - Torque receives status metadata only
   - raw driver-license/insurance/trade-offer bytes never become agent conversation content
   - no lender submission or credit-pull authority

3. **Video Hub Contract**
   - NorAutoMatch owns canonical video metadata
   - external TikTok/Instagram/Facebook/YouTube links are distribution records
   - no automatic social publishing authority in this foundation

## Non-goals

This foundation does not:
- activate a live Orr chat integration
- collect SSNs or bank credentials
- submit credit applications
- submit anything to lenders
- enable public sensitive-document storage
- publish to social networks
- expand Torque's authority
- deploy production

Authority effect: NONE.
