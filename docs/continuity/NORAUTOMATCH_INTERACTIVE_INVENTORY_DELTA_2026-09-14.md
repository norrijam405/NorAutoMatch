# NorAutoMatch Interactive Inventory Continuity Delta — 2026-09-14

## Canonical live state
- Repository: `norrijam405/NorAutoMatch`
- Canonical Render branch: `reactivation/2026-09-08`
- Live commit: `4d67b71a2e3c2df1427c2ae9e97443e45fdd5cdd`
- Render service: `srv-dah04krl550s73d12v70`
- Live URL: `https://norautomatch.onrender.com`
- Deploy receipt: `dep-dajofg0jo6nc73f40l5g` -> LIVE

## Product decisions now implemented
1. Homepage inventory remains compact instead of becoming a giant catalog. The main page uses a small horizontal inventory window and routes deeper browsing to `/inventory`.
2. `/inventory` is the interactive catalog / game board.
3. Inventory search supports natural-language token matching over verified source data. Examples: `red Rogue AWD`, `CarPlay SUV`, `black Frontier 4x4`.
4. Search uses verified vehicle identity, drivetrain aliases, color aliases, condition, VIN, and source-provided features. Missing attributes are never invented.
5. Quick feature chips appear only when the verified source data supports matching units. Initial supported concepts include AWD/4WD, CarPlay, heated seats, leather, sunroof/moonroof, and third-row seating.
6. Full inventory is paged 12 vehicles at a time on mobile to avoid an endless wall of cards.
7. Zero-result states explain that the exact combination may not be in verified inventory or the source may not provide the requested feature field.
8. Vehicle cards remain entry points into mini product experiences: SwipeMatch, Garage save, Garage Battle, and secure finance-interest next step.
9. Garage and Garage Battle remain session-local product behavior at this stage; persistent cross-session Garage / full Match DNA scoring are future work.
10. Vehicle-specific monthly-payment promises remain prohibited. Customer comfort target may guide matching internally, but NorAutoMatch does not display a promised payment or approval.
11. Finance-interest flow is intentionally not a credit application. It collects only ordinary contact information and vehicle/VIN context, explicitly rejects SSN/DOB/income/bank-data collection, and does not authorize a credit inquiry.

## Inventory data-path changes
- `Vehicle` now carries optional `condition`, `exteriorColor`, `interiorColor`, and `features` from verified inventory.
- `inventory-bridge.ts` passes those verified attributes to the customer UX.
- Orr Algolia normalization now preserves validated source-provided photo URLs from known media fields when available, while retaining the placeholder fallback if the source does not provide usable photos.
- Existing dealer boundary, source verification, freshness, malformed-row quarantine, and fail-closed inventory rules remain in force.

## User-live issue that motivated this delta
On mobile, the user searched `carplay` and got 0 vehicles because the previous search haystack only included year/make/model/trim/drivetrain/body type. The user specifically requested Orr-style free-text inventory search where a phrase such as `red rogue with awd` can return matching verified units. The new search path addresses that without fabricating unsupported attributes.

## Next mission
1. User-live test `/inventory` on mobile and desktop.
2. Verify phrases such as `red Rogue AWD`, `CarPlay`, `black Frontier 4x4`, and mixed feature/body-style searches against current live inventory.
3. Verify source-provided photos actually render for live units; if the current provider media field shape differs, inspect the existing safe media-field diagnostics and update the parser only from observed field names/types.
4. Improve Match DNA from decorative/product-direction copy into observed session-derived signals from likes/passes/Garage behavior.
5. Improve Garage Battle from basic drivetrain/mileage comparison into preference-weighted plain-language fit differences.
6. Preserve the finance boundary: do not collect restricted credit data in NorAutoMatch until a separately qualified secure credit-application surface and explicit credit-report authorization flow exist.

## Truth boundary
- LIVE means the current Render deployment succeeded and serves the updated application.
- It does not by itself prove every natural-language phrase will return a match; results depend on current verified inventory and source-provided attributes.
- No claim is made that a customer has financing approval, a quoted payment, or a reserved vehicle.
