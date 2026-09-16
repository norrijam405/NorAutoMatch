# NorAutoMatch Supabase Auth R1 Receipt

Date: 2026-09-16
Current branch: `feature/2026-09-15-supabase-auth-r1`
Auth UX live code SHA: `e78802ec06b194c05e1e6e4c835cd1edf3c57145`
Truth state: **IMPLEMENTED / BUILD-VERIFIED / OUTSIDE-IN UI + ROUTE VERIFIED / HUMAN EMAIL LOOP STILL OPEN**

## Implemented

- separate Supabase project `igniaqua-norautomatch` (`xiqfmaibhhtffrxibiov`)
- browser/server SSR clients
- server-side verified identity checks
- protected `/account` and `/garage`
- RLS owner-scoped profiles and saved vehicles
- membership roles with ordinary new users bootstrapped only to `norautomatch/member`
- `/manager` requires elevated NorAutoMatch membership before page entry
- sensitive manager APIs continue to require the pre-existing signed short-lived manager session and durable revocation checks
- Sign in is now directly discoverable in the public header
- Garage is directly discoverable in primary navigation
- mobile account access is explicit
- Sign in and Create account are distinct UI modes rather than two competing submit buttons in one form
- signup UI explains email confirmation before account creation
- resend confirmation recovery is exposed
- unconfirmed-email handling is explicit
- confirmation callback supports both PKCE auth-code and token-hash confirmation flows

## Outside-in verification

Hardened public smoke against `https://norautomatch-live.onrender.com` verified:
- `/login` -> 200
- sign-in mode present
- create-account mode present
- create-account link present
- one primary submit action present
- resend-confirmation recovery present
- header Sign in present
- header Garage present
- unauthenticated `/account` -> 307 to login
- unauthenticated `/garage` -> 307 to login
- unauthenticated `/manager` -> 307 to login

The public smoke also verified that the NorAuto Match badge/brand remains visible after the auth/navigation changes.

## Security / authority boundary

- normal users cannot self-assign operator/admin/founder roles
- browser-facing authorization relies on RLS and scoped membership rather than trusting user-controlled metadata
- service/elevated secrets are not exposed in the browser
- TOAT infrastructure is not used by NorAutoMatch
- authentication does not grant deal, pricing, financing, or manager authority

## Open user-live proof

A complete successful real-user sequence remains open:

`Create account -> receive confirmation email -> click confirmation -> sign in -> open Garage -> save vehicle -> sign out -> sign back in -> verify saved vehicle persists`

The prior user-live attempt exposed UX ambiguity and confirmation-flow issues. Those defects were corrected afterward, but the corrected end-to-end mailbox exercise has not yet been independently completed by a human. It must not be called user-live PASS until that occurs.
