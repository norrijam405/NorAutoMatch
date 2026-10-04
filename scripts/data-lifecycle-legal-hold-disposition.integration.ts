import assert from "node:assert/strict";
import { Pool } from "pg";
import {
  confirmExternalCopiesRemoved,
  executePrimaryRedaction,
  placeLegalHold,
  releaseLegalHold,
  requestPrimaryRedaction,
  resolveBackupDisposition,
} from "../src/lib/data-lifecycle-postgres";

const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL is required for legal-hold disposition integration.");

const pool = new Pool({ connectionString, max: 4 });
const workspaceId = "lifecycle-hold-disposition";
const opportunityId = "namo_999999999999999999999999";

async function seedOpportunity() {
  await pool.query(
    `INSERT INTO crm_opportunities (
       opportunity_id, workspace_id, intake_idempotency_key, pipeline, stage, desk_state,
       customer, buying_intent, inventory_evidence, attribution, latest_handoff_id,
       created_at, updated_at
     ) VALUES (
       $1, $2, $3, 'Standard Retail', 'NEW', 'NOT_PREPARED',
       $4::jsonb, $5::jsonb, '{}'::jsonb, '{}'::jsonb, 'namh_999999999999999999999999',
       '2026-09-12T05:10:00Z', '2026-09-12T05:10:00Z'
     )`,
    [
      opportunityId,
      workspaceId,
      "9".repeat(64),
      JSON.stringify({ firstName: "Hold", lastName: "Overlay", email: "hold.overlay@example.test", phone: "+14055550177", consent: true }),
      JSON.stringify({ notes: "legal hold overlay integration" }),
    ],
  );
}

async function main() {
  await seedOpportunity();

  const preHold = await placeLegalHold({
    pool,
    workspaceId,
    opportunityId,
    legalHoldRef: "legal-hold:pre-redaction-001",
    legalHoldAuthority: "COUNSEL_DIRECTION",
    observedAt: "2026-09-12T05:11:00Z",
  });
  assert.equal(preHold.status, "PLACED");

  const preHoldReplay = await placeLegalHold({
    pool,
    workspaceId,
    opportunityId,
    legalHoldRef: "legal-hold:pre-redaction-001",
    legalHoldAuthority: "COUNSEL_DIRECTION",
    observedAt: "2026-09-12T05:11:00Z",
  });
  assert.equal(preHoldReplay.status, "DEDUPLICATED");

  await requestPrimaryRedaction({
    pool,
    workspaceId,
    opportunityId,
    requestRef: "privacy-request:hold-overlay-001",
    requestAuthority: "VERIFIED_CUSTOMER_REQUEST",
    requestedAt: "2026-09-12T05:12:00Z",
    externalCopies: "MAY_EXIST",
  });

  await assert.rejects(
    executePrimaryRedaction({
      pool,
      workspaceId,
      opportunityId,
      redactedAt: "2026-09-12T05:13:00Z",
    }),
    /DATA_LIFECYCLE_BLOCKED_BY_LEGAL_HOLD/,
  );

  const releasedPreHold = await releaseLegalHold({
    pool,
    workspaceId,
    opportunityId,
    legalHoldRef: "legal-hold:pre-redaction-001",
    releaseRef: "legal-release:pre-redaction-001",
    releaseAuthority: "COUNSEL_RELEASE",
    releasedAt: "2026-09-12T05:14:00Z",
  });
  assert.equal(releasedPreHold.status, "RELEASED");

  const releasedPreHoldReplay = await releaseLegalHold({
    pool,
    workspaceId,
    opportunityId,
    legalHoldRef: "legal-hold:pre-redaction-001",
    releaseRef: "legal-release:pre-redaction-001",
    releaseAuthority: "COUNSEL_RELEASE",
    releasedAt: "2026-09-12T05:14:00Z",
  });
  assert.equal(releasedPreHoldReplay.status, "DEDUPLICATED");

  await assert.rejects(
    releaseLegalHold({
      pool,
      workspaceId,
      opportunityId,
      legalHoldRef: "legal-hold:pre-redaction-001",
      releaseRef: "legal-release:conflicting",
      releaseAuthority: "COUNSEL_RELEASE",
      releasedAt: "2026-09-12T05:14:00Z",
    }),
    /DATA_LIFECYCLE_LEGAL_HOLD_RELEASE_EVIDENCE_CONFLICT/,
  );

  const redaction = await executePrimaryRedaction({
    pool,
    workspaceId,
    opportunityId,
    redactedAt: "2026-09-12T05:15:00Z",
  });
  assert.equal(redaction.backupTruth, "PENDING_SEPARATE_DISPOSITION");
  assert.equal(redaction.externalCopyTruth, "MAY_EXIST");

  const redactedCustomer = await pool.query<{ customer: unknown }>(
    `SELECT customer FROM crm_opportunities WHERE workspace_id = $1 AND opportunity_id = $2`,
    [workspaceId, opportunityId],
  );
  assert.deepEqual(redactedCustomer.rows[0].customer, { redacted: true });

  const postHoldA = await placeLegalHold({
    pool,
    workspaceId,
    opportunityId,
    legalHoldRef: "legal-hold:post-redaction-a",
    legalHoldAuthority: "COUNSEL_DIRECTION",
    observedAt: "2026-09-12T05:16:00Z",
  });
  const postHoldB = await placeLegalHold({
    pool,
    workspaceId,
    opportunityId,
    legalHoldRef: "legal-hold:post-redaction-b",
    legalHoldAuthority: "COUNSEL_DIRECTION",
    observedAt: "2026-09-12T05:16:30Z",
  });
  assert.equal(postHoldA.status, "PLACED");
  assert.equal(postHoldB.status, "PLACED");

  await assert.rejects(
    resolveBackupDisposition({
      pool,
      workspaceId,
      opportunityId,
      dispositionRef: "backup-expiry:hold-overlay-001",
      dispositionAuthority: "AUTHORIZED_BACKUP_DISPOSITION",
      observedAt: "2026-09-12T05:17:00Z",
    }),
    /DATA_LIFECYCLE_BACKUP_BLOCKED_BY_LEGAL_HOLD/,
  );
  await assert.rejects(
    confirmExternalCopiesRemoved({
      pool,
      workspaceId,
      opportunityId,
      dispositionRef: "external-removal:hold-overlay-001",
      dispositionAuthority: "AUTHORIZED_EXTERNAL_DISPOSITION",
      observedAt: "2026-09-12T05:17:00Z",
    }),
    /DATA_LIFECYCLE_EXTERNAL_DISPOSITION_BLOCKED_BY_LEGAL_HOLD/,
  );

  await releaseLegalHold({
    pool,
    workspaceId,
    opportunityId,
    legalHoldRef: "legal-hold:post-redaction-a",
    releaseRef: "legal-release:post-redaction-a",
    releaseAuthority: "COUNSEL_RELEASE",
    releasedAt: "2026-09-12T05:18:00Z",
  });

  await assert.rejects(
    resolveBackupDisposition({
      pool,
      workspaceId,
      opportunityId,
      dispositionRef: "backup-expiry:hold-overlay-001",
      dispositionAuthority: "AUTHORIZED_BACKUP_DISPOSITION",
      observedAt: "2026-09-12T05:18:30Z",
    }),
    /DATA_LIFECYCLE_BACKUP_BLOCKED_BY_LEGAL_HOLD/,
  );

  await releaseLegalHold({
    pool,
    workspaceId,
    opportunityId,
    legalHoldRef: "legal-hold:post-redaction-b",
    releaseRef: "legal-release:post-redaction-b",
    releaseAuthority: "COUNSEL_RELEASE",
    releasedAt: "2026-09-12T05:19:00Z",
  });

  const external = await confirmExternalCopiesRemoved({
    pool,
    workspaceId,
    opportunityId,
    dispositionRef: "external-removal:hold-overlay-001",
    dispositionAuthority: "AUTHORIZED_EXTERNAL_DISPOSITION",
    observedAt: "2026-09-12T05:20:00Z",
  });
  assert.equal(external.externalCopies, "SEPARATELY_CONFIRMED_REMOVED");
  assert.equal(external.externalDispositionAuthority, "AUTHORIZED_EXTERNAL_DISPOSITION");

  const backup = await resolveBackupDisposition({
    pool,
    workspaceId,
    opportunityId,
    dispositionRef: "backup-expiry:hold-overlay-001",
    dispositionAuthority: "AUTHORIZED_BACKUP_DISPOSITION",
    observedAt: "2026-09-12T05:21:00Z",
  });
  assert.equal(backup.state, "PRIMARY_REDACTED_BACKUP_EXPIRED");
  assert.equal(backup.backupDisposition, "EXPIRED_OR_PURGED");
  assert.equal(backup.backupDispositionAuthority, "AUTHORIZED_BACKUP_DISPOSITION");

  await assert.rejects(
    pool.query(
      `UPDATE crm_data_lifecycle
          SET external_copies = 'MAY_EXIST'
        WHERE workspace_id = $1 AND opportunity_id = $2`,
      [workspaceId, opportunityId],
    ),
    /DATA_LIFECYCLE_EXTERNAL_DISPOSITION_IMMUTABLE/,
  );
  await assert.rejects(
    pool.query(
      `UPDATE crm_data_lifecycle
          SET backup_disposition = 'PENDING_EXPIRY'
        WHERE workspace_id = $1 AND opportunity_id = $2`,
      [workspaceId, opportunityId],
    ),
    /DATA_LIFECYCLE_BACKUP_DISPOSITION_IMMUTABLE/,
  );
  await assert.rejects(
    pool.query(
      `DELETE FROM crm_data_lifecycle_legal_holds
        WHERE workspace_id = $1 AND opportunity_id = $2`,
      [workspaceId, opportunityId],
    ),
    /DATA_LIFECYCLE_LEGAL_HOLD_IMMUTABLE/,
  );

  const final = await pool.query<{
    state: string;
    backup_disposition: string;
    backup_disposition_ref: string;
    backup_disposition_authority: string;
    backup_disposition_observed_at: Date;
    external_copies: string;
    external_disposition_ref: string;
    external_disposition_authority: string;
    external_disposition_observed_at: Date;
  }>(
    `SELECT state, backup_disposition, backup_disposition_ref,
            backup_disposition_authority, backup_disposition_observed_at,
            external_copies, external_disposition_ref,
            external_disposition_authority, external_disposition_observed_at
       FROM crm_data_lifecycle
      WHERE workspace_id = $1 AND opportunity_id = $2`,
    [workspaceId, opportunityId],
  );
  assert.equal(final.rows[0].state, "PRIMARY_REDACTED_BACKUP_EXPIRED");
  assert.equal(final.rows[0].backup_disposition_ref, "backup-expiry:hold-overlay-001");
  assert.equal(final.rows[0].external_disposition_ref, "external-removal:hold-overlay-001");

  const activeHolds = await pool.query(
    `SELECT 1 FROM crm_data_lifecycle_legal_holds
      WHERE workspace_id = $1 AND opportunity_id = $2 AND released_at IS NULL`,
    [workspaceId, opportunityId],
  );
  assert.equal(activeHolds.rowCount, 0);

  console.log("data lifecycle legal-hold disposition integration: PASS");
}

main()
  .finally(async () => pool.end())
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
