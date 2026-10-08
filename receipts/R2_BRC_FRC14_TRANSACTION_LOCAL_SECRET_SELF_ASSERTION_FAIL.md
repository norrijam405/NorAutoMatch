# R2 BRC-FRC-14 transaction-local HMAC secret self-assertion FAIL

Exact frozen product candidate:
`354d3f6e4cfd83f9f02df8ce34d1de3fd944d967`

Tree:
`238eddd3a9b8704d3a90689ccb4e118f1a9e7925`

Role: separate Broad Release-Candidate Fresh Re-Challenger.

## Finding

**NORAUTOMATCH-R2-BRC-FRC-14 — TRANSACTION_LOCAL_HMAC_SECRET_SELF_ASSERTION**

The FRC-13 deferred PostgreSQL publication guard reads its HMAC verification secret from custom transaction-local settings. PostgreSQL permits the SQL session itself to assign custom settings.

Therefore the same direct-SQL writer being checked can:
1. choose an attacker-controlled HMAC secret;
2. forge a matching publication proof;
3. set the custom publication-secret GUC in its transaction;
4. insert a reply directly;
5. satisfy the deferred guard using the attacker-selected secret.

## Fresh runtime reproduction

Evidence branch:
`evidence/r2-frc13-fresh-rechallenge-frc14-20261008`

The evidence branch changes only the challenger integration witness and workflow trigger/name relative to the frozen product candidate. No product file changed.

Workflow:
`37859028703`

Job:
`113590077129`

Result:
SUCCESS

Preserved marker:
`FRC14_WITNESS transaction-local HMAC secret self-assertion bypassed deferred publication guard`

The same job also re-established:
- FRC-12 pre-issuance read authenticity PASS;
- FRC-13 application publication authenticity PASS;
- inherited production bootstrap, communication, secure-document, typecheck, and build gates.

## Disposition

**BROAD_FRESH_RECHALLENGER_FAIL / BRC-FRC-14_OPEN / REMEDIATION_REQUIRED / NO_PRODUCTION_AUTHORITY**

Stopped at the first material new finding. No remediation, merge, deploy, or production activation occurred in this challenger role.
