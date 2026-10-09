# NorAutoMatch R2 BRC-FRC-16 Remediation Builder Activation

Finding:
`NORAUTOMATCH-R2-BRC-FRC-16 — DIRECT_SQL_CAN_SELF_ASSERT_AUTHENTICATED_CUSTOMER_OPPORTUNITY_BINDING`

Failed product candidate:
`98f61d355b1c6127e3464338b81caeaa81381f66`

Failed product tree:
`e368f5370efb0b8de65300b819819daa0c8a6b83`

Fresh challenge evidence:
GitHub Actions run `37994358001`.

Builder branch:
`remediation/r2-frc16-authenticated-customer-binding`

Required verification:
- production launcher installs and records v14;
- trust-anchor and insert-authenticity guard are present;
- historical BRC-FRC-01 remains green through the governed issuance path;
- raw direct SQL cannot mint a binding;
- attacker-selected transaction-local secret cannot mint a binding;
- governed server secret can still issue a legitimate binding;
- legitimate document linkage remains functional;
- typecheck and production build pass.

No merge.
No deployment.
No production authority.
