# NorAutoMatch Signup Silent-Failure Remediation — 2026-10-03

## Preserved defect

Founder-live observation on the public service:
- public site loaded successfully from a normal browser;
- Create account did not create a visibly confirmed account;
- no customer-facing error or success state was surfaced.

The existing signup path used a Next.js Server Action. Current Render-to-Render smoke also showed edge-level HTTP 429 behavior, while normal founder browsing remained reachable. The exact cause of the silent Server Action failure was not falsely asserted.

## Remediation

The Create account flow was changed to use the existing browser-safe Supabase client directly from the customer browser.

Properties:
- uses only the existing `NEXT_PUBLIC_SUPABASE_URL` and browser-safe publishable key;
- no service-role or other elevated secret is exposed;
- RLS/auth authority boundaries are unchanged;
- email confirmation remains required;
- redirect target remains same-origin `/auth/confirm`;
- explicit inline customer-visible error state added;
- explicit submitting state added;
- network failure now produces a visible error instead of silent failure;
- sign-in and resend-confirmation flows remain otherwise unchanged.

Commits:
- component introduction: `ffdcbfd48098a73c8936ebe765bd87d40a0d8722`
- exact remediated R1 head: `55ad3d41fc4dc28690c4551df981a57501451165`
- parent of exact remediated head: `ffdcbfd48098a73c8936ebe765bd87d40a0d8722`

## Verification

Existing zero-cost auth validator:
- service: `norautomatch-auth-r1-validator`
- deploy: `dep-db0iu2942hec73e9jfbg`
- exact checkout: `55ad3d41fc4dc28690c4551df981a57501451165`
- TypeScript: PASS
- Next.js production build: PASS
- 28 routes generated
- build successful

## Live deployment

Existing public service only; no new resource:
- service: `norautomatch-live`
- service ID: `srv-dakr4qlbedkc73c75pi0`
- deploy: `dep-db0iuqh42hec73e9m4a0`
- exact deployed SHA: `55ad3d41fc4dc28690c4551df981a57501451165`
- Render state: LIVE
- prior deploy `dep-damo87ijnfac73agjbcg` at `454fd810...` deactivated

## Remaining human gate

The founder must now perform only:
`Create account -> observe visible result -> receive confirmation email -> click confirmation -> enter the confirmed account`

Garage persistence is already banked and does not need to be repeated.

## Separate security observation

The deployment install reported 9 npm audit findings (8 high, 1 critical). The signup remediation did not introduce dependency changes. The release still uses Next.js `16.3.3`; current upstream security guidance includes a critical advisory patched in `16.3.6`. This is preserved as a separate production-security closure gate and was not hidden by the signup remediation.

Authority effect: **NONE**.
