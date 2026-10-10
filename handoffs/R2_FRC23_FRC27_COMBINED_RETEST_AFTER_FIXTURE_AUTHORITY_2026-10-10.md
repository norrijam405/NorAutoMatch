# NorAutoMatch R2 — FRC-23 through FRC-27 Combined Retest

The prior combined verification exposed legacy test-fixture writes that conflict with the new FRC-25 assignment-authority boundary.

Only the regression fixture was adapted to use the governed assignment authority path.
The frozen integrated product lineage remains rooted at:
`68183fad9b88d312d60f58b624ceb08a81910e05`

Re-run the complete combined five-lane verification, broad regressions, typecheck, and production build.

No merge to main.
No deployment.
No production authority.
