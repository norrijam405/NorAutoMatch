import assert from "node:assert/strict";
import { createPostgresCrmPool } from "../src/lib/crm-postgres-adapter";
import { createVerifiedCustomerOpportunityBinding, requireVerifiedCustomerOpportunityBinding } from "../src/lib/customer-opportunity-binding";
import { readDeskDocumentReadiness } from "../src/lib/crm-document-readiness";

async function main() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL required");

  const serverSecret = process.env.NORAUTO_PUBLIC_ABUSE_HMAC_SECRET;
  if (!serverSecret || serverSecret.trim().length < 32) throw new Error("NORAUTO_PUBLIC_ABUSE_HMAC_SECRET required");

  const pool = createPostgresCrmPool(connectionString);
  const workspaceId = "norautomatch";
  const userA = "00000000-0000-4000-8000-0000000000a1";
  const userB = "00000000-0000-4000-8000-0000000000b2";
  const oppA = "namo_aaaaaaaaaaaaaaaaaaaaaaaa";
  const oppB = "namo_bbbbbbbbbbbbbbbbbbbbbbbb";
  const docA = "00000000-0000-4000-8000-0000000000d1";
  const badHistoric = "00000000-0000-4000-8000-0000000000d2";

  try {
    await pool.query("delete from customer_secure_documents");
    await pool.query("delete from crm_opportunity_customer_bindings");
    await pool.query("delete from crm_follow_up_obligations");
    await pool.query("delete from crm_outbox");
    await pool.query("delete from crm_manager_review_receipts");
    await pool.query("delete from crm_evidence");
    await pool.query("delete from crm_opportunities");

    for (const [opportunityId, keyChar, userId] of [
      [oppA, "a", userA],
      [oppB, "b", userB],
    ] as const) {
      await pool.query(
        `insert into crm_opportunities (
          opportunity_id, workspace_id, intake_idempotency_key, pipeline, stage, desk_state,
          customer, buying_intent, inventory_evidence, attribution, latest_handoff_id,
          created_at, updated_at
        ) values (
          $1,$2,$3,'Standard Retail','NEW','MANAGER_REVIEW_PENDING',
          '{}'::jsonb,'{}'::jsonb,'{}'::jsonb,'{}'::jsonb,$4,clock_timestamp(),clock_timestamp()
        )`,
        [opportunityId, workspaceId, keyChar.repeat(64), `namh_${keyChar.repeat(24)}`],
      );
      await createVerifiedCustomerOpportunityBinding({
        pool,
        workspaceId,
        opportunityId,
        customerUserId: userId,
        evidenceRef: `synthetic-binding:${opportunityId}`,
        authority: "AUTHENTICATED_CUSTOMER",
        serverSecret,
      });
    }

    await pool.query(
      `insert into customer_secure_documents (
        id,user_id,opportunity_id,kind,status,received_at,raw_deleted_at
      ) values ($1,$2::uuid,null,'DRIVER_LICENSE','RECEIVED',clock_timestamp(),null)`,
      [docA, userA],
    );

    await assert.rejects(
      requireVerifiedCustomerOpportunityBinding({
        pool,
        workspaceId,
        opportunityId: oppB,
        customerUserId: userA,
      }),
      /SECURE_DOCUMENT_OPPORTUNITY_CUSTOMER_MISMATCH/,
    );

    await requireVerifiedCustomerOpportunityBinding({
      pool,
      workspaceId,
      opportunityId: oppA,
      customerUserId: userA,
    });

    await assert.rejects(
      pool.query(
        "update customer_secure_documents set opportunity_id=$1 where id=$2",
        [oppB, docA],
      ),
      /SECURE_DOCUMENT_OPPORTUNITY_CUSTOMER_MISMATCH/,
    );

    await pool.query(
      "update customer_secure_documents set opportunity_id=$1 where id=$2",
      [oppA, docA],
    );

    const readinessA = await readDeskDocumentReadiness({
      pool,
      workspaceId,
      opportunityIds: [oppA],
      requiredKinds: ["DRIVER_LICENSE"],
    });
    assert.equal(readinessA.get(oppA)?.state, "READY_FOR_MANAGER_REVIEW");

    await pool.query("alter table customer_secure_documents disable trigger customer_secure_document_opportunity_binding_guard");
    await pool.query(
      `insert into customer_secure_documents (
        id,user_id,opportunity_id,kind,status,received_at,raw_deleted_at
      ) values ($1,$2::uuid,$3,'INSURANCE','RECEIVED',clock_timestamp(),null)`,
      [badHistoric, userA, oppB],
    );
    await pool.query("alter table customer_secure_documents enable trigger customer_secure_document_opportunity_binding_guard");

    const readinessB = await readDeskDocumentReadiness({
      pool,
      workspaceId,
      opportunityIds: [oppB],
      requiredKinds: ["INSURANCE"],
    });
    assert.equal(
      readinessB.get(oppB)?.state,
      "INCOMPLETE",
      "historically bad cross-customer linkage must not count toward desk readiness",
    );
    assert.equal(readinessB.get(oppB)?.required[0]?.state, "MISSING");

    console.log("PASS secure-document customer/opportunity binding boundary");
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
