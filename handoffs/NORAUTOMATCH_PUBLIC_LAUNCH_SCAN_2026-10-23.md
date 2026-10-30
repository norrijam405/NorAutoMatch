# NorAutoMatch public-launch scan — 2026-10-23
Evidence branch: remediation/2026-10-13-scout-hunt-relevance-gate
Conclusion: PREVIEW BUILD READY/IN PROGRESS, PRODUCTION/GOOGLE BUSINESS PROFILE NOT APPROVED FOR LAUNCH.

## Proven by inspected GitHub code
- Public /find-my-car, /inventory, /vehicles and /vehicles/[vin] routes present.
- Verified Orr source search, dealer 2175 association, full-feed gates, fail-closed demo policy.
- Save the Sale in protected Watchtower, PriceCheck on VIN detail, image/video local preview input, MatchDNA and Garage workflows, watchtower hunt persistence.
- Homepage CTA, global header/footer matcher navigation fixed to /find-my-car during audit.
- Detail page 10-page source-bound discrepancy fixed to 20, aligning with customer inventory.
- Garage requires sign-in to persist; saving a car does not reserve it. Visual recognition/video identification not live; photo preview only.
- Contact and salesperson dashboard protected; no authorized external CRM write integration verified.

## Operational observations
- Vercel Preview of prior HEAD 220d0c9 was READY with Vercel commit status SUCCESS. No PR-triggered GitHub workflow runs were found for that SHA.
- Branch was 183 commits ahead of main at the inspection point; not merged.
- Preview env contains live-inventory activation, CRM DB URL and Supabase public auth config; no production deployment or production env verified.
- Independent requests to Preview routes were inaccessible from available browser/runner, so end-to-end UX is NOT independently verified.
- Vercel runtime-log API previously returned 403, limiting source-failure investigation.
- Real-time consistent inventory availability, save to Garage / sale removal, deep-link click behavior, mobile UX, and contact workflow remain unverified. Preview source has historically failed intermittently.

## Launch blockers — complete before Google Business Profile URL change
1. Verify intended public production domain, DNS, HTTPS, robots/sitemap and deployment with matching production environment (not Preview URLs).
2. Validate stable Orr feed across repeated full-snapshot reads and VIN deep links, including 503/failure presentation; fix transient upstream source errors without claiming stale inventory as available.
3. Execute typecheck, lint, inventory/regression and end-to-end browser tests on the final commit. Test public guest flows on mobile and desktop; homepage -> search -> result -> VIN -> PriceCheck -> optional Garage signup and return.
4. Confirm intended lead/consent/privacy/terms/contact accuracy and that independent NorAutoMatch is not falsely presented as official Orr business.
5. Verify domain actually belongs to user and links to matching Google Business Profile business; do not modify dealership Google Business Profile without its authorization.
6. Verify inventory removal/sold status/expiration so saved cars never imply an indefinite hold.
7. Release from tested frozen commit and monitor live logs/error rates after publishing.

## Feature-state truth
- Inventory: integrated via source-gated public Algolia, historically intermittently verified.
- Vehicle detail/photo/card links and PriceCheck: committed, automated E2E not verified.
- MatchDNA: present, persistent save depends on sign-in and synchronization verification.
- Visual search: local photo/video preview only. No recognition.
- PriceCheck: client-side customer-entered comparison; no automatic competitor feed or price-match promise.
- Vehicle Hunt: Preview save/reload previously manually and DB verified.
- Google Business Profile: no publication executed.
