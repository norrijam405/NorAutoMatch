# R2 BRC-FRC-08 Rechallenge

Act as a new separate Broad Release-Candidate Fresh Re-Challenger.

Repository: `norrijam405/NorAutoMatch`

Challenge only `e7463084182089c2cbc0b3fe8732f8b38e5d8966`, tree `feff684ae62017b6fa5843e9af9c295a3c2ea679`.
Failed predecessor: `41d3042b41e685b1f384a78a1840bdba77bc762e`.

Read PR #70, IgniAqua issue #29, the prior FRC-08 FAIL receipt, and `receipts/R2_BRC_FRC08_SITE_CHAT_BOOTSTRAP_PASS.md`.

No remediation, merge, or deploy.

Re-test first: real `npm start` migration-only must install and record the site-chat migration; `crm_site_chat_access`, `crm_site_chat_replies`, `crm_site_chat_reply_access_commit_guard`, and `norauto_enforce_site_chat_reply_access_at_commit` must exist; repeated startup must remain idempotent; the same-site race regression must pass without manual site-chat schema installation.

Then continue BRC-FRC-07 through BRC-FRC-01 and the remaining broad matrix. Stop at the first material finding. PASS does not authorize production.
