# NorAutoMatch R2 Same-Site Ask Torque Reply Thread — Exact-Head PASS — 2026-10-05

PR #49 — R2 same-site Ask Torque replies

- branch: feature/2026-10-05-site-chat-reply-thread-r0
- head: fc58079f31a30c67ca90ad124295cc6ee193468f
- tree: f4d2816502e34d9ee738421553c24f8baabbc741
- base: a34b853a25704d58f6d5cec6fdb24c432fa523ba
- state: DRAFT
- production deployment: NOT PERFORMED

Exact-head verification:
- workflow: NorAutoMatch Same-Site Chat Thread CI
- run: 37304980230
- conclusion: SUCCESS
- production dependency audit, bounded conversation/thread schema install, Ask Torque normalization, same-site reply transport integration, TypeScript, and production build passed

Behavior:
- browser receives a high-entropy opaque same-site thread token
- only SHA-256 token hash is stored server-side
- same-site thread access expires after seven days
- customer can explicitly check for website replies
- manager must pass existing short-lived manager-session boundary to publish
- only NORAUTO_SITE_CHAT conversations are eligible
- replies are durable website-thread records
- external delivery remains NOT PERFORMED

Truth boundaries:
- no automatic AI send
- no email/SMS/phone delivery claim
- no Motive/Ask AI delivery claim
- no appointment/reservation claim
- no financing approval or lender submission
- no plaintext browser access token stored in CRM
- authority effect: NONE

Disposition: EXACT_HEAD_SOFTWARE_AND_POSTGRES_INTEGRATION_PASS / DEPENDENT_DRAFT / NO_PRODUCTION_ACTIVATION