# NorAuto Match — Public Launch Runbook

## Purpose

This runbook describes the first public-facing deployment boundary for NorAuto Match. It is intentionally conservative: publish the customer experience with **representative/demo inventory first**, durable lead persistence enabled, and customer-visible live inventory disabled until a separate controlled activation review is satisfied.

## Truth boundary

A successful deployment proves only that the public web service is serving the expected customer experience and that explicitly tested production dependencies behave correctly. It does **not** by itself prove live inventory freshness, dealership authority, credit approval, external CRM delivery, vehicle availability, or a sold outcome.

## Initial public inventory posture

Use:

```text
NORAUTO_INVENTORY_MODE=demo
NORAUTO_LIVE_INVENTORY_ACTIVATION=
```

Do not set `NORAUTO_LIVE_INVENTORY_ACTIVATION` during the first public launch. Representative vehicles must remain labeled as examples, not current availability claims.

## Required production inputs

The hosting environment must provide, outside the repository:

- `NORAUTO_CRM_DATABASE_URL` — non-local PostgreSQL connection string.
- `NORAUTO_MANAGER_SESSION_SECRET` — unique random secret, at least 32 characters.
- `NORAUTO_RELAY_TRIGGER_TOKEN` — separate unique random secret, at least 32 characters.
- `NEXT_PUBLIC_SITE_URL` — the final public HTTPS origin. Because it is a `NEXT_PUBLIC_` value, it must also be supplied when the Docker image is built.
- `NORAUTO_INVENTORY_MODE=demo` for first public release.
- `NORAUTO_LIVE_INVENTORY_ACTIVATION` blank.
- `CRM_WEBHOOK_URL` may remain blank. The durable outbox remains authoritative until an external CRM endpoint is intentionally configured.

Never commit production credentials to GitHub.

## Database initialization

Apply the schema in this exact order to the production database before accepting public leads:

1. `infrastructure/norautomatch-crm-v1.sql`
2. `infrastructure/norautomatch-crm-v2-manager-handoffs.sql`
3. `infrastructure/norautomatch-crm-v3-outbox-relay.sql`

Use a database identity with only the privileges required by the application. Do not run destructive development behavior SQL against production.

## Container build

The image requires the final public origin at build time:

```bash
docker build \
  --build-arg NEXT_PUBLIC_SITE_URL=https://YOUR-PUBLIC-HOST \
  -t norautomatch-public:<immutable-release-id> .
```

The image runs as a non-root user and exposes port 3000. `/api/health` is the container health boundary.

## Required first-deploy checks

Before sending traffic, verify all of the following against the deployed HTTPS origin:

1. `/api/health` returns HTTP 200 with:
   - `service = norauto-match`
   - `status = SERVING`
   - `inventory.effectiveMode = demo`
   - `inventory.customerVisibleLiveInventory = false`
   - `truthScope = PUBLIC_SERVING_HEALTH_ONLY`
   - `authorityEffect = NONE`
2. `/` renders the representative-inventory disclosure.
3. `/terms` and `/privacy` render successfully.
4. `/playbook`, `/master-build-prompt`, and `/master-build-prompt/download` return 404.
5. Baseline response headers include `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and the configured `Permissions-Policy`.
6. The final HTTPS origin matches the canonical metadata/site URL built into the release image.

## Lead acceptance gate

Do not send paid or broad public traffic until lead persistence has been exercised against the production database with controlled synthetic data and a durable receipt or database check confirms the record was committed.

If the production database is absent or persistence fails, `/api/leads` must return HTTP 503. That behavior is fail-closed and preferable to acknowledging a lead that was not durably stored.

Synthetic launch-validation leads must be unmistakably labeled as synthetic and must never be counted as a customer conversion.

## Live inventory boundary

Customer-visible live inventory remains a separate authority-controlled change.

Before considering it:

- production configuration preflight must pass;
- a recent Orr dealer-2175 shadow observation must pass;
- the activation-readiness evaluator must return `CONTROLLED_ACTIVATION_REVIEW_PREREQUISITES_ONLY`;
- a human with authority must explicitly choose to activate customer-visible live inventory;
- post-activation observation must verify that the deployed site is actually showing the bounded qualified source and still fails closed when source trust breaks.

Readiness is not authority. A passing shadow receipt does not turn live inventory on.

## Rollback

If the public app is reachable but a material dependency is uncertain:

- keep or restore `NORAUTO_INVENTORY_MODE=demo`;
- keep `NORAUTO_LIVE_INVENTORY_ACTIVATION` blank;
- preserve failed receipts/logs before changing state;
- prefer 503/fail-closed intake over accepting unpersisted leads;
- roll back to the last exact release SHA that passed post-promotion and public-launch smoke checks.

## Initial launch acceptance state

The first public milestone should be described as **public-serving representative-inventory launch with durable lead intake**, not as live-inventory production proof. Live inventory, external CRM delivery, and real-customer outcome validation remain separate evidence gates.
