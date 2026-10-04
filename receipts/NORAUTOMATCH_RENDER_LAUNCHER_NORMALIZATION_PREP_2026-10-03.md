# NorAutoMatch Render Launcher Normalization Preparation — 2026-10-03

## Canonical source change

PR #38 was merged to main.

- merge commit: `71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`
- tree: `26e02e5ac2967e2b86d35b6fe2d4e0347ecac6d0`

The launcher now recognizes:

`NORAUTO_SKIP_CRM_MIGRATIONS=1`

When set, launcher-managed CRM migrations are skipped explicitly while standalone runtime preparation and server startup still execute.

This prevents a launcher-normalization deployment from accidentally mutating the already-governed production CRM schema.

## Render preparation

The live Render service received:

`NORAUTO_SKIP_CRM_MIGRATIONS=1`

The environment update triggered a redeploy of the pre-normalization runtime; no launcher behavior changed yet because the existing Render start command still bypasses `npm start`.

The release branch `feature/2026-09-15-supabase-auth-r1` was fast-forwarded to canonical main commit:

`71bdb2640fa2e30b8cd34d32a7cbdcf62f9966fe`

Therefore the live service can remain configured to its current branch name and still deploy canonical main bytes after the start-command change.

## Remaining human gate

The only required dashboard mutation is on service `norautomatch-live`:

Change Start Command from:

`npx next start -H 0.0.0.0 -p $PORT`

to:

`npm start`

Do not change build command, environment variables, plan, or service URL.

After that change, manually deploy the service. Expected startup evidence:
- `MIGRATION_SKIPPED NORAUTO_SKIP_CRM_MIGRATIONS`
- `STANDALONE_RUNTIME_PREPARED`
- server reaches ready/live state

Then perform fresh outside-in smoke and bank final launcher-normalization receipt.

Authority effect: NONE.
