# NorAutoMatch R2 — Five-Lane Destroyer Pilot

Role: single-window Destroyer orchestrator managing five isolated challenge lanes.

Repository: `norrijam405/NorAutoMatch`

Challenge ONLY frozen candidate:
`98f61d355b1c6127e3464338b81caeaa81381f66`

Expected tree:
`e368f5370efb0b8de65300b819819daa0c8a6b83`

Do not substitute a moving branch head.
Do not remediate.
Do not merge.
Do not deploy.
PASS does not authorize production.

## Isolation doctrine

Treat each lane as an independent adversarial mission with its own:
- target boundary;
- preserved historical finding;
- exact witness/reproducer;
- evidence log;
- PASS/FAIL result;
- new-finding identifier if materially broken.

Do not let evidence from one lane satisfy another lane.
Do not stop the other lanes merely because one lane fails, unless the failed condition invalidates the shared frozen-candidate identity or makes another lane's result non-independent.
At the end, emit one lane result record per lane plus an aggregate pilot result.

## Lane D1 — BRC-FRC-01 secure-document customer binding

Historical finding:
`NORAUTOMATCH-R2-BRC-FRC-01 — CROSS_CUSTOMER_SECURE_DOCUMENT_CAN_BE_LINKED_TO_UNRELATED_OPPORTUNITY`

Re-test on the frozen candidate:
- a secure document for customer A cannot be linked with authority to customer B's opportunity;
- direct database manipulation cannot make that bad linkage authoritative;
- desk/document readiness must independently reject historically bad or bypassed cross-customer linkage;
- valid same-customer binding must still work;
- no email/phone heuristic may substitute for explicit authenticated customer binding.

Historical remediation PR: #63.

## Lane D2 — BRC-FRC-03 communication ledger immutability

Historical finding:
`BRC-FRC-03 — communication evidence ledger mutable after append`

Re-test:
- direct SQL UPDATE fails;
- direct SQL DELETE fails;
- append-only legitimate writes still succeed;
- readback preserves the original event truth;
- no alternate write path may silently rewrite historical communication evidence.

Historical remediation PR: #65.

## Lane D3 — BRC-FRC-06 provider receipt truth

Historical finding:
`BRC-FRC-06 — unverified provider receipt can mint delivery truth`

Re-test:
- rep-entered/arbitrary provider receipt strings cannot create DELIVERED or FAILED authority;
- legacy unverified receipt rows remain non-authoritative;
- delivery status stays fail-closed without separately governed provider verification;
- no alternate request/body/database path bypasses the verification boundary.

Historical remediation PR: #68.

## Lane D4 — BRC-FRC-10 site-chat reply immutability

Historical finding:
`BRC-FRC-10 — published site-chat replies mutable after publication`

Re-test:
- direct SQL UPDATE is rejected;
- direct SQL DELETE is rejected;
- TRUNCATE is rejected;
- legitimate governed insert/publication still succeeds;
- FRC-09 insert-truth and deferred access-at-commit protections remain intact.

Historical remediation PR: #72.

## Lane D5 — BRC-FRC-15 publication trust-chain relation shadowing

Historical finding:
`BRC-FRC-15 — temporary-relation shadow can substitute for security-critical production relations`

Re-test:
- temp `crm_site_chat_publication_secret_anchor` carries no authority;
- temp `crm_site_chat_access` carries no authority;
- attacker-selected secret + forged matching proof + temp shadow fails at deferred commit;
- forged reply rolls back and does not persist;
- trust functions retain fixed `pg_catalog, public` search paths;
- security-critical references remain explicitly `public.*`;
- FRC-14 self-asserted transaction-local secret remains closed;
- legitimate publication with the governed server secret still succeeds.

Historical remediation PR: #77.

## Fresh attack requirement

After historical witnesses pass, each lane must independently attempt at least one fresh adversarial variation that is meaningfully different from the preserved witness but stays inside that lane's boundary.

If a fresh variation produces a material defect:
- assign the next available lane-local provisional finding label;
- preserve exact reproduction steps and evidence;
- do NOT remediate in this role;
- continue the other independent lanes where safe.

## Aggregate result

Allowed lane states:
- PASS
- FAIL_NEW_FINDING
- BLOCKED_VERIFICATION

Allowed aggregate states:
- FIVE_LANE_PASS
- FIVE_LANE_FINDINGS_PRESENT
- FIVE_LANE_VERIFICATION_BLOCKED

No aggregate PASS is production authority.
