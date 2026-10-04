import assert from "node:assert/strict";
import { Pool } from "pg";
import {
  attachConversationRedactionTarget,
  placeLegalHold,
  requestPrimaryRedaction,
} from "../src/lib/data-lifecycle-postgres";

const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for lifecycle audit hardening integration.");

const pool = new Pool({ connectionString, max: 3 });
const workspaceId = "lifecycle-audit-hardening";
const heldOpportunityId = "namo_eeeeeeeeeeeeeeeeeeeeeeee";
const requestOpportunityId = "namo_ffffffffffffffffffffffff";

async function seedOpportunity(opportunityId: string, idempotencyDigit: string) {
  await pool.query(
    `INSERT INTO crm_opportunities (
       opportunity_id, workspace_id, intake_idempotency_key, pipeline, stage, desk_state,
       customer, buying_intent, inventory_evidence, attribution, latest_handoff_id,
       created_at, updated_at
     ) VALUES (
       $1, $2, $3, 'Standard Retail', 'NEW', 'NOT_PREPARED',
       '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
       $4, '2026-09-12T04:30:00Z', '2026-09-12T04:30:00Z'
     )`,
    [opportunityId, workspaceId, idempotencyDigit.repeat(64), `namh_${idempotencyDigit.repeat(24)}`],
  );
}

async function main() {
  await seedOpportunity(heldOpportunityId, "7");
  await seedOpportunity(requestOpportunityId, "8");

  await assert.rejects(
    requestPrimaryRedaction({
      pool,
      workspaceId,
      opportunityId: requestOpportunityId,
      requestRef: "privacy-request:user@example.test",
      requestAuthority: "VERIFIED_CUSTOMER_REQUEST",
      requestedAt: "2026-09-12T04:31:00Z",
    }),
    /DATA_LIFECYCLE_REQUEST_REF_INVALID_IDENTIFIER/,
  );

  await assert.rejects(
    placeLegalHold({
      pool,
      workspaceId,
      opportunityId: heldOpportunityId,
      legalHoldRef: "legal-hold:audit-001",
      legalHoldAuthority: "Counsel Direction",
      observedAt: "2026-09-12T04:32:00Z",
    }),
    /DATA_LIFECYCLE_HOLD_AUTHORITY_INVALID_IDENTIFIER/,
  );

  const hold = await placeLegalHold({
    pool,
    workspaceId,
    opportunityId: heldOpportunityId,
    legalHoldRef: "legal-hold:audit-001",
    legalHoldAuthority: "COUNSEL_DIRECTION",
    observedAt: "2026-09-12T04:32:00Z",
  });
  assert.equal(hold.status, "PLACED");
  assert.equal(hold.holdRef, "legal-hold:audit-001");

  const exactReplay = await placeLegalHold({
    pool,
    workspaceId,
    opportunityId: heldOpportunityId,
    legalHoldRef: "legal-hold:audit-001",
    legalHoldAuthority: "COUNSEL_DIRECTION",
    observedAt: "2026-09-12T04:32:00Z",
  });
  assert.equal(exactReplay.status, "DEDUPLICATED");
  assert.equal(exactReplay.holdRef, "legal-hold:audit-001");

  await assert.rejects(
    placeLegalHold({
      pool,
      workspaceId,
      opportunityId: heldOpportunityId,
      legalHoldRef: "legal-hold:audit-001",
      legalHoldAuthority: "OTHER_COUNSEL",
      observedAt: "2026-09-12T04:32:00Z",
    }),
    /DATA_LIFECYCLE_LEGAL_HOLD_EVIDENCE_CONFLICT/,
  );

  await assert.rejects(
    pool.query(
      `UPDATE crm_data_lifecycle_legal_holds
          SET hold_authority = 'OTHER_AUTHORITY'
        WHERE workspace_id = $1 AND opportunity_id = $2 AND hold_ref = 'legal-hold:audit-001'`,
      [workspaceId, heldOpportunityId],
    ),
    /DATA_LIFECYCLE_LEGAL_HOLD_IDENTITY_IMMUTABLE/,
  );

  await assert.rejects(
    pool.query(
      `INSERT INTO crm_data_lifecycle (
         workspace_id, opportunity_id, state,
         request_ref, request_authority, requested_at,
         backup_disposition, external_copies, authority_effect
       ) VALUES ($1, $2, 'REDACTION_REQUESTED',
         'privacy-request:user@example.test', 'VERIFIED_CUSTOMER_REQUEST', '2026-09-12T04:33:00Z',
         'UNKNOWN', 'NOT_KNOWN', 'NONE')`,
      [workspaceId, requestOpportunityId],
    ),
    /crm_data_lifecycle_request_ref_identifier/,
  );

  const request = await requestPrimaryRedaction({
    pool,
    workspaceId,
    opportunityId: requestOpportunityId,
    requestRef: "privacy-request:audit-001",
    requestAuthority: "VERIFIED_CUSTOMER_REQUEST",
    requestedAt: "2026-09-12T04:33:00Z",
  });
  assert.equal(request.state, "REDACTION_REQUESTED");

  await assert.rejects(
    pool.query(
      `UPDATE crm_data_lifecycle
          SET request_authority = 'OTHER_AUTHORITY'
        WHERE workspace_id = $1 AND opportunity_id = $2`,
      [workspaceId, requestOpportunityId],
    ),
    /DATA_LIFECYCLE_EVIDENCE_IMMUTABLE:request_authority/,
  );

  await assert.rejects(
    attachConversationRedactionTarget({
      pool,
      workspaceId,
      opportunityId: requestOpportunityId,
      provider: "integration-provider",
      eventId: "event-not-needed-because-validation-fails-first",
      targetRef: "privacy-request:405-555-0199",
    }),
    /DATA_LIFECYCLE_TARGET_REF_INVALID_IDENTIFIER/,
  );

  const persistedHold = await pool.query<{
    hold_ref: string;
    hold_authority: string;
    released_at: Date | null;
  }>(
    `SELECT hold_ref, hold_authority, released_at
       FROM crm_data_lifecycle_legal_holds
      WHERE workspace_id = $1 AND opportunity_id = $2`,
    [workspaceId, heldOpportunityId],
  );
  assert.equal(persistedHold.rows[0].hold_ref, "legal-hold:audit-001");
  assert.equal(persistedHold.rows[0].hold_authority, "COUNSEL_DIRECTION");
  assert.equal(persistedHold.rows[0].released_at, null);

  console.log("data lifecycle audit hardening integration: PASS");
}

main()
  .finally(async () => pool.end())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
