# NorAutoMatch R2 Successor Handoff — 2026-10-05

You are the next autonomous NorAutoMatch operator.

Repository: `norrijam405/NorAutoMatch`

Do not ask Norris to reconstruct history already preserved in GitHub.

## Operating rules

- Work only on NorAutoMatch and clearly NorAutoMatch-owned resources unless a narrow IgniAqua coordination action is explicitly required.
- Evidence first. Exact candidate SHAs/trees matter.
- No paid infrastructure.
- No destructive production mutations without a reversible path and proof.
- Do not expose secrets in GitHub/chat.
- Do not silently broaden Torque, manager, finance, lender, or social-publishing authority.
- Do not treat a draft PR as production-ready merely because software CI passed.
- Preserve R1 production until an R2 lane independently closes.
- Motive/RideMotive native chat integration is OPTIONAL. Norris explicitly chose not to pursue Motive support/account friction right now. NorAutoMatch's own Ask Torque path is the active customer-chat strategy.
- Do not use Norris's school email for dealership/vendor outreach.
- Do not resume undocumented Motive/LangGraph endpoint automation merely because browser traffic was observable.

## Canonical production baseline

`main` remains:
- commit: `71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`
- tree: `26e02e5ac2967e2b86d35b6fe2d4e0347ecac6d0`

R1 customer-facing production was already banked PRODUCTION_READY before the R2 work below.

Do not disturb R1 while R2 candidates remain draft.

---

# R2 lane status

## PR #39 — Durable Inventory Cache

Title: `R2 reconcile durable inventory cache onto canonical main`

- state: OPEN / DRAFT
- head: `15ca730a685f7b52a09f6cbeaa3c739fbbed86a7`
- base: canonical main `71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`
- mergeable: true
- dedicated cache CI: run `37171814592` — SUCCESS
- dedicated Supabase V12/V13 cache schema prepared
- private `igniaqua` cache tables exist with RLS
- no fabricated cache inventory was seeded
- least-privilege role `norauto_inventory_runtime` exists but login/password activation remains a founder credential gate
- live cache is NOT customer-active
- verified-live Orr fallback remains the production path

Remaining before cache production-ready:
1. founder privately enables the DB login/credential and puts the connection URI directly into Render
2. real Orr provider sync
3. persisted provenance/freshness/readback proof
4. cache-first customer read proof
5. stale/unavailable cache verified-live fallback proof
6. independent challenge/assurance
7. exact promotion only after all above

IgniAqua tracking: issue #16.

Do not revive the old expiring Render Postgres for this lane.

## PR #40 — Customer Workspace / Secure Document Foundation

Title: `R2 customer workspace foundation — Torque bridge, secure docs, video hub`

- state: OPEN / DRAFT
- head: `d7cae2fc1f3790ccd01087c896591b78b8b10463`
- tree: `f9b430364a880868ae306635dbe043624c254eaa`
- base: canonical main
- mergeable: true
- exact-head Customer Workspace Foundation CI: run `37261552458` — SUCCESS
- receipt: `receipts/NORAUTOMATCH_R2_SECURE_CUSTOMER_DOCUMENT_VAULT_EXACT_HEAD_PASS_2026-10-04.md`

Implemented and prepared:
- Orr/RideMotive authorized-event normalization contract
- secure customer document metadata/status boundary
- Deal Readiness truth model
- private Supabase bucket `customer-secure-documents`
- RLS metadata and append-only access evidence
- PDF/JPG/PNG/WebP only
- 12 MiB cap
- MIME magic-byte validation
- SHA-256 metadata
- same-origin upload guard
- manager secure-document desk
- 60-second signed manager view links
- CRM opportunity verification before ACCEPTED state
- retention/deletion controls
- Torque sees status only, not raw files/storage paths
- no lender submission / financing approval / deal approval authority

Public secure-document upload remains FAIL-CLOSED unless both are explicitly configured:
- `NORAUTO_SECURE_DOCUMENTS_ACTIVATION=ACTIVE`
- `NORAUTO_SECURE_DOCUMENT_RETENTION_DAYS=<approved integer>`

No retention duration has been approved/invented.

Compliance research was documented on NorAutoMatch issue #42:
- FTC Safeguards guidance supports minimizing retention and disposing customer info when business/legal need ends
- Oklahoma dealer rules require certain purchase/sale records for three years
- recommended architecture: NorAutoMatch as secure intake/staging, dealership official system as long-term record where required
- exact NorAutoMatch raw-file retention period still needs dealership/compliance approval before activation

IgniAqua assurance: issue #19.

## PR #44 — Desk Document Readiness

Title: `R2 desk document readiness — connect secure vault status to manager queue`

- state: OPEN / DRAFT
- head: `7b5fcb3dbfd446f1933f3c60628c984125e50ba4`
- base: PR #40 head
- mergeable: true
- exact-head CI: run `37270446734` — SUCCESS
- receipt: `receipts/NORAUTOMATCH_R2_DESK_DOCUMENT_READINESS_EXACT_HEAD_PASS_2026-10-05.md`

Behavior:
- existing manager queue now surfaces document readiness
- READY / MISSING / REVIEW_REQUIRED
- no raw doc, filename, hash, signed URL, or storage path in queue payload
- required document kinds remain configurable; no invented dealership policy
- lender submission remains NOT_PERFORMED
- authority effect NONE

IgniAqua assurance: issue #20.

## PR #45 — Customer Deal Prep Center

Title: `R2 customer Deal Prep Center — unify Garage and secure documents`

- state: OPEN / DRAFT
- head: `621cafeeed7089c704b41842ac9a68484aa22587`
- tree: `8cd50250655cc8170f6b2a419d1a733a015f223d`
- base: PR #44 head
- mergeable: true
- exact-head CI: run `37271880116` — SUCCESS
- receipt: `receipts/NORAUTOMATCH_R2_CUSTOMER_DEAL_PREP_CENTER_EXACT_HEAD_PASS_2026-10-05.md`

Behavior:
- protected `/account/deal-prep`
- one customer workspace for Garage + Secure Documents
- shows saved vehicle count, active docs, ready docs, unresolved docs
- `DESK_LINKED` only when governed document metadata already carries a real NorAutoMatch opportunity link
- no name/email/phone heuristic CRM matching
- raw docs not visible to Torque
- no lender/financing/deal authority

IgniAqua assurance: issue #21.

## PR #46 — Video Hub Library

Title: `R2 Video Hub library — canonical videos with social publication links`

- state: OPEN / DRAFT
- head: `f2f4bb1d4dff9960723bafa9fc876de924fc3203`
- tree: `6ec2da3168465cc63b90c666a76a8180ce53672a`
- base: PR #40 head
- mergeable: true
- exact-head CI: run `37272291913` — SUCCESS
- receipt: `receipts/NORAUTOMATCH_R2_VIDEO_HUB_LIBRARY_EXACT_HEAD_PASS_2026-10-05.md`

Prepared:
- `public.video_hub_entries` in dedicated NorAutoMatch Supabase
- RLS enabled
- public reads only PUBLIC rows
- operator/admin/founder writes
- manager `/manager/videos`
- public `/videos`
- canonical URL, title, summary, topics, VIN associations
- YouTube/TikTok/Instagram/Facebook publication links as evidence records
- no automatic social posting
- no social credentials
- no binary video hosting in this candidate
- storage table was empty at preparation

IgniAqua assurance: issue #22.

## PR #47 — Ask Torque Intake

Title: `R2 Ask Torque intake — customer messages into existing conversation gateway`

- state: OPEN / DRAFT
- head: `a34b853a25704d58f6d5cec6fdb24c432fa523ba`
- tree: `d3fab5ffad6cc47d8f9b1d1b9536d144364d47d4`
- base: PR #40 head
- mergeable: true
- exact-head CI: run `37272900430` — SUCCESS
- receipt: `receipts/NORAUTOMATCH_R2_ASK_TORQUE_INTAKE_EXACT_HEAD_PASS_2026-10-05.md`

Behavior:
- public `/ask-torque`
- bounded `/api/ask-torque`
- same-origin enforcement
- existing public-abuse controls
- 12 KiB request ceiling
- stable conversation/message IDs
- optional VIN
- explicit selected response channel + communication consent
- persists into existing conversation-event store
- responseExecution = NOT_PERFORMED
- customerReachedState = NOT_CLAIMED
- no Orr/Motive endpoint impersonation
- no reservation/appointment/finance/lender claim

This is the active customer-chat direction while Motive native integration is deferred.

IgniAqua assurance: issue #23.

## PR #48 — Torque Video Recommendations

Title: `R2 Torque video recommendations — VIN-matched public Video Hub links`

- state: OPEN / DRAFT
- head: `d62349330991550d0f257f589314db832b7ee6ac`
- tree: `143531a570e91e2a80cce3c8558a93e627987e2a`
- base: PR #46 head
- mergeable: true
- exact-head CI: run `37273316331` — SUCCESS
- receipt: `receipts/NORAUTOMATCH_R2_TORQUE_VIDEO_RECOMMENDATIONS_EXACT_HEAD_PASS_2026-10-05.md`

Behavior:
- extracts exact VINs from existing conversation subject refs
- PUBLIC Video Hub rows only
- manager response-prep API returns bounded video recommendations
- manager conversation desk shows relevant videos beside DRAFT_ONLY response
- nothing auto-sent
- video links are NOT treated as proof of price/availability/financing/reservation/appointment/SOLD/LOST

IgniAqua assurance: issue #24.

---

# Motive / Orr native-chat decision

Norris explicitly decided to stop spending time on Motive Ask AI account/support friction for now.

Reason:
- owner approval is business-level: if it helps sell cars, proceed
- owner does not know/care about Motive/API details
- Norris's company email is Gmail but Motive/support flow was pushing Outlook
- Norris does not want dealership/vendor outreach coming from his school email

Therefore:
- do NOT block NorAutoMatch on Motive
- do NOT ask Norris to email Motive from school
- keep issue #41 as optional future official-integration discovery
- use NorAutoMatch's own Ask Torque intake as the current customer-chat entry path

Public Motive research already confirmed Motive offers Nissan Ask AI/chat, trade/service/credit tooling and dealer integrations, but no public supported chat webhook/reply API was found.

---

# Supabase security notes

Dedicated NorAutoMatch Supabase project:
`peyrnfeytjgsuxqxloxt`

Prepared R2 areas include:
- durable inventory cache schema
- secure customer document vault
- Video Hub metadata table

Do not create fake customer data merely to claim runtime proof.

Secure-document advisor warnings for authenticated SECURITY DEFINER RPCs were explicitly documented, not hidden. They are auth.uid-bound and anon is denied. Existing leaked-password protection warning is unrelated pre-existing debt.

---

# What to do next

The predecessor operator was about to continue building the customer/rep workflow, but the correct successor priority is now:

1. Reconcile assurance results from IgniAqua issues #19–#24 as they arrive. Do not merge challenged candidates before assurance closure.
2. Preserve exact frozen candidate SHAs while assurance is pending.
3. Build only new value that does not duplicate existing CRM/desk/conversation systems.
4. A strong next lane is the **rep/customer communication follow-up layer** on top of Ask Torque + manager response prep:
   - customer message status/history
   - explicit human/rep response send path
   - evidence that a message was actually sent/delivered
   - no invented response/delivery state
   - preserve consent and preferred-contact truth
5. Another useful lane is the **controlled runtime proof** for Video Hub using synthetic/non-customer metadata, because its schema is prepared and empty.
6. Do not activate secure customer-document uploads until retention days are approved and independent assurance closes.
7. Do not activate durable inventory cache until founder performs the private DB login credential step.
8. Do not merge all stacked R2 PRs blindly. Reconcile dependency topology and assure exact candidates first.
9. Do not deploy R2 to production until each production-facing dependency has an explicit closure receipt.

---

# Founder interaction gates

Only involve Norris when a genuine founder/manual gate is unavoidable.

Known manual/founder gates:
- inventory DB runtime credential/login for PR #39
- final secure-document retention policy value before activation
- any vendor login/invite if Norris later chooses to revisit Motive
- any dealership policy choice that changes real customer/legal handling

Otherwise keep working autonomously.

Authority effect: NONE.
