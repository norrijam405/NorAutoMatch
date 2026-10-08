# R2 Broad Fresh Re-Challenge — FRC-14 source finding (runtime witness pending)

Role: Separate Broad Release-Candidate Fresh Re-Challenger.
Frozen commit: `354d3f6e4cfd83f9f02df8ce34d1de3fd944d967`
Expected tree: `238eddd3a9b8704d3a90689ccb4e118f1a9e7925`
Failed predecessor: `44580f8fde04a4d75f32f8e70a927ed96c0d65d4`
No merge, no deploy, no product remediation.

## Finding
**NORAUTOMATCH-R2-BRC-FRC-14 — TRANSACTION_LOCAL_HMAC_SECRET_SELF_ASSERTION**

Severity: potentially material publication-integrity bypass. Status: **SOURCE_FINDING / RUNTIME_WITNESS_PENDING / NO_PRODUCTION_AUTHORITY**.

At frozen candidate, `infrastructure/norautomatch-site-chat-publication-authenticity-r3.sql` defines `norauto_enforce_site_chat_reply_access_at_commit()` to obtain `current_secret` from `current_setting('norautomatch.site_chat_publication_hmac_secret', true)`, and then calls `norauto_site_chat_publication_proof_valid()` using that session-provided secret. The validator checks HMAC equality and the minimum secret length; no independently trusted server-secret source is enforced in the database.

A direct SQL writer already authorized to INSERT into the access and reply tables can potentially:
1. Choose an arbitrary secret of length >= 32.
2. Compute a publication HMAC for an attacker-inserted access row (workspace, conversation, token verifier).
3. In the same transaction, set the custom `norautomatch.site_chat_publication_hmac_secret` GUC to its chosen secret.
4. INSERT a reply referencing an existing eligible event and the correct current assignee.
5. Commit; the deferred guard appears to accept the matching row/proof and caller-selected secret.

The before-insert truth guard validates event eligibility and published_by against current owner but does not independently authenticate proof or source of DB session configuration. FRC-12 browser read authenticity remains a separate property; this attack aims at publication without browser-token authority.

### Evidence
- `infrastructure/norautomatch-site-chat-publication-authenticity-r3.sql` (frozen candidate)
- `infrastructure/norautomatch-site-chat-thread-r0.sql` (before-insert reply guard)
- `src/lib/site-chat-thread.ts` (application sets the same GUC legitimately)

### Challenge required
Execute a fresh isolated PostgreSQL transaction as the same low-privilege SQL role used by the governed direct-SQL adversary. Create a syntactically valid fake access row and matching HMAC for a caller-chosen secret; set the custom GUC; insert a reply into an eligible assigned conversation; test whether COMMIT succeeds. Record exact role, DB schema, transaction, SQLSTATE, logs and row visibility. Also verify whether role permissions disallow GUC override (ordinary custom GUCs are user-settable).

**Do not count this as runtime-confirmed.** Local full R2 test execution is blocked by unavailable repository checkout, GitHub DNS and PostgreSQL runtime in the current execution environment. Existing Builder workflow SUCCESS is prior evidence, not fresh challenger PASS.

Gate: **BROAD_RECHALLENGE_STOPPED_AT_FIRST_MATERIAL_SOURCE_FINDING / NO_RELEASE_APPROVAL**.
