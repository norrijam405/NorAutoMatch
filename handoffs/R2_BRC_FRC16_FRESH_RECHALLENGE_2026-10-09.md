# NorAutoMatch R2 BRC-FRC-16 Fresh Re-Challenger Activation

Act as a new separate Fresh Re-Challenger.

Repository:
`norrijam405/NorAutoMatch`

Challenge ONLY exact frozen successor:
`e7f4c5bfc64ec898e885b9b2cb31b461e5cfd1a7`

Expected root tree:
`195b81bc6459570e8409cade05ec51c4cc064f7f`

Failed predecessor:
`98f61d355b1c6127e3464338b81caeaa81381f66`

Do not substitute a moving branch head.
Do not remediate.
Do not merge.
Do not deploy.

Re-test FRC-16 first:
- raw direct SQL cannot insert a customer/opportunity binding;
- attacker-selected transaction-local binding secret cannot authorize insert;
- legitimate governed server secret still permits binding issuance;
- a legitimately issued binding still authorizes exact same-customer secure-document linkage;
- historical cross-customer mismatch remains rejected;
- binding rows remain immutable.

Then independently challenge:
- temporary relation shadow for `crm_customer_binding_secret_anchor`;
- attacker-schema function/search-path shadow for `norautomatch_customer_binding_secret_trusted`;
- UPDATE/DELETE/TRUNCATE attempts against the trust anchor;
- alternate UPSERT/conflict paths against binding immutability/authenticity;
- production bootstrap and migration idempotency.

Continue the relevant broad R2 regression surface after FRC-16.

Stop at the first material new finding.
PASS does not authorize production.
