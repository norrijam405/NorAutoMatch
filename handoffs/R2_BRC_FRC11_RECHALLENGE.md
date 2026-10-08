# R2 BRC-FRC-11 broad rechallenge

Act as a new separate Broad Release-Candidate Fresh Re-Challenger.

Repository:
`norrijam405/NorAutoMatch`

Challenge only exact candidate:
`5bac3306f9f2dccf9b01d667e5832f241ce6fcfb`

Tree:
`9c924f2678ac533b60841da3349f91415131b0f3`

Failed predecessor:
`3d41f642129b0912a6279fbf6b28e52f4c2f0d5e`

Read:
- PR #73
- IgniAqua Control Plane issue #29
- prior BRC-FRC-11 FAIL receipt
- `receipts/R2_BRC_FRC11_SITE_CHAT_ACCESS_CAPABILITY_PASS.md`

Do not remediate, merge, or deploy.

Re-test BRC-FRC-11 first:
- legitimate initial site-thread access issuance must work;
- legitimate thread reads must still update `last_seen_at`;
- direct SQL must not rewrite `access_token_hash`;
- direct SQL must not extend or otherwise rewrite `expires_at`;
- direct SQL must not reassign `workspace_id`;
- direct SQL must not reassign `conversation_id`;
- DELETE must not permit delete-and-reissue takeover;
- TRUNCATE must fail;
- attacker-chosen token must remain unauthorized;
- original legitimate token must remain authorized;
- expiry must remain fail-closed;
- real production bootstrap must install and record the FRC-11 versioned migration and all new guards.

Then re-test BRC-FRC-10 through BRC-FRC-01 and continue the complete remaining broad R2 release-candidate challenge matrix.

Stop at the first material new finding.

PASS does not authorize production.
