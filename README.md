# NorAuto Match

Payment-first vehicle matching and personal car sourcing for the Oklahoma City metro.

## What is built

- Interactive reverse-amortization matcher (7% APR estimate)
- Monthly payment, down payment, and 36/48/60/72-month controls
- Brand and body-style filters
- Swipe/pass/shortlist interaction
- Persistent inventory feed with dimmed exclusion states
- Vehicle-sourcing route when no active matches remain
- Traditional inventory browse with permanent sourcing CTA
- Shared lead capture with `Standard Retail` vs `Vehicle Sourcing` routing
- CRM webhook integration
- Oklahoma City metro service-area pages, including Mustang and Piedmont
- Metadata, JSON-LD, robots, sitemap, privacy/consent, and finance disclaimers

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000.

## CRM connection

Set `CRM_WEBHOOK_URL` to a Zapier, Make, n8n, HubSpot, or other HTTPS webhook. Each validated submission is sent as JSON. Trapdoor submissions contain:

```json
{
  "trigger": "trapdoor",
  "pipeline": "Vehicle Sourcing"
}
```

Standard vehicle inquiries contain:

```json
{
  "trigger": "retail",
  "pipeline": "Standard Retail"
}
```

In production, the form intentionally returns a clear fallback message until `CRM_WEBHOOK_URL` is configured. No lead PII is written into the repository or server logs.

## Production checklist

1. Point the approved NorAuto Match domain and set `NEXT_PUBLIC_SITE_URL`.
2. Configure `CRM_WEBHOOK_URL` and test both pipelines end to end.
3. Replace demonstration inventory in `src/lib/inventory.ts` with a GM-approved live feed.
4. Replace representative AI vehicle imagery with approved unit photos.
5. Add analytics and ad conversion IDs only after the consent/attribution plan is approved.
6. Approval received (reported August 14, 2026). Preserve the written approval and keep deployment, advertising, inventory use, and lead ownership within its documented scope.
7. Ensure all vehicle sales, financing, registration, and delivery are handled by Orr Nissan West or the approved licensed selling dealership.

## Important

The inventory and imagery currently included are representative product-demo data. They are not a claim of live availability. Payment estimates exclude taxes, title, registration, dealer fees, products, and credit-specific terms and are not an offer of credit.
