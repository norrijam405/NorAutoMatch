# NorAutoMatch R2 BRC-FRC-16 Remediation Builder PASS

Date: 2026-10-09

Finding:
`NORAUTOMATCH-R2-BRC-FRC-16 — DIRECT_SQL_CAN_SELF_ASSERT_AUTHENTICATED_CUSTOMER_OPPORTUNITY_BINDING`

Failed candidate:
`98f61d355b1c6127e3464338b81caeaa81381f66`

Failed tree:
`e368f5370efb0b8de65300b819819daa0c8a6b83`

Frozen remediation successor:
`e7f4c5bfc64ec898e885b9b2cb31b461e5cfd1a7`

Frozen successor tree:
`195b81bc6459570e8409cade05ec51c4cc064f7f`

Builder CI:
`37994671533`

Result:
`BUILDER_VERIFICATION_PASS`

Verified:
- production dependency security gate;
- production PostgreSQL bootstrap;
- v14 authenticated customer binding migration installed and recorded;
- v13 and v14 verification;
- migration rerun idempotency;
- historical BRC-FRC-01 secure-document/customer binding regression;
- direct-SQL binding mint rejected;
- attacker-selected transaction-local binding secret rejected;
- governed server secret preserves legitimate binding issuance;
- product typecheck;
- production build.

Remediation mechanism:
- immutable domain-separated customer-binding trust anchor;
- fixed `pg_catalog, public` search path on trust functions;
- BEFORE INSERT authenticity guard on `crm_opportunity_customer_bindings`;
- governed server helper for legitimate binding issuance.

Builder PASS does not close FRC-16.
A separate Fresh Re-Challenger must independently attack the frozen successor.
No merge.
No deployment.
No production authority.
