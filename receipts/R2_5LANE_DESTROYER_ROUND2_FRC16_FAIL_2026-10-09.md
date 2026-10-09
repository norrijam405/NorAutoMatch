# NorAutoMatch R2 Five-Lane Destroyer Round 2 — D1 FAIL / D2-D5 PASS

Date: 2026-10-09

Frozen product candidate challenged:
`98f61d355b1c6127e3464338b81caeaa81381f66`

Expected frozen product tree:
`e368f5370efb0b8de65300b819819daa0c8a6b83`

Fresh challenge harness commit:
`1a12badfa8babe3f5340425e24b78da61f41f468`

GitHub Actions run:
`37994358001`

## Aggregate result

`FIVE_LANE_FINDINGS_PRESENT`

## D1 — FAIL_NEW_FINDING

Provisional finding:
`NORAUTOMATCH-R2-BRC-FRC-16 — DIRECT_SQL_CAN_SELF_ASSERT_AUTHENTICATED_CUSTOMER_OPPORTUNITY_BINDING`

Historical BRC-FRC-01 witness first passed.

Fresh variation then demonstrated:
1. create an otherwise valid unbound CRM opportunity;
2. create a secure document owned by customer A with no opportunity binding;
3. directly insert into `crm_opportunity_customer_bindings` with:
   - customer A,
   - the target opportunity,
   - `authority='AUTHENTICATED_CUSTOMER'`,
   - attacker-selected `evidence_ref`;
4. the database accepts that self-asserted authority row;
5. the secure-document binding guard subsequently treats it as authoritative;
6. updating the secure document to the forged opportunity succeeds.

Observed challenge error:
`NEW_FINDING_D1_FORGED_BINDING_MINTS_CROSS_CUSTOMER_AUTHORITY`

Material effect:
The FRC-01 guard correctly enforces exact document-user/opportunity binding, but the authority source it trusts can itself be minted by direct SQL without independent evidence verification.

## D2 — PASS

Fresh UPSERT mutation attempt could not rewrite append-only communication evidence.

## D3 — PASS

Fresh `INSERT ... SELECT` forged provider-receipt attempt could not mint delivery truth.

## D4 — PASS

Fresh UPSERT conflict path could not rewrite a published site-chat reply.

## D5 — PASS

Attacker-schema function/search-path shadow could not substitute for schema-qualified publication trust functions.

## Governance

Only D1 is routed to Defender remediation.
D2-D5 remain independently green for this frozen candidate and fresh variation set.

No merge.
No deployment.
No production authority.
