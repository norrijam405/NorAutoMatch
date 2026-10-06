import assert from "node:assert/strict";
import type { Pool, PoolClient, QueryResult } from "pg";
import { createPostgresCrmPool } from "../src/lib/crm-postgres-adapter";
import { publishSiteChatReply } from "../src/lib/site-chat-thread";

/**
 * Fresh Re-Challenger executable specification for:
 * NORAUTOMATCH-R2-FC01-FRC-03
 *
 * Exact candidate:
 * 3e2a612decade0c953f4c2202ce507430026bd25
 *
 * The candidate performs a final access SELECT after INSERT and before COMMIT.
 * This challenge proves that the positive result of that SELECT can become stale
 * before publishSiteChatReply() receives the result and issues COMMIT.
 *
 * No candidate product code is modified. The wrapper delays only delivery of the
 * already-completed second access-query result to the application.
 */
async function main() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL;
  if (!connectionString) throw new Error("NORAUTO_CRM_DATABASE_URL required");

  const rawPool = createPostgresCrmPool(connectionString);
  const workspaceId = "norautomatch-frc03";
  const provider = "NORAUTO_SITE_CHAT";
  const conversationId = "site-frc03-0000-4000-8000-000000000001";
  const eventId = "site-frc03-0000-4000-8000-000000000002";
  const rep = "synthetic-current-owner";

  try {
    await rawPool.query("delete from crm_site_chat_replies where workspace_id=$1", [workspaceId]);
    await rawPool.query("delete from crm_site_chat_access where workspace_id=$1", [workspaceId]);
    await rawPool.query("delete from crm_conversation_assignments where workspace_id=$1", [workspaceId]);
    await rawPool.query("delete from crm_conversation_events where workspace_id=$1 and provider=$2", [workspaceId, provider]);

    await rawPool.query(
      `insert into crm_conversation_events (
         workspace_id,provider,event_id,conversation_id,event_type,observed_at,
         normalized_payload,routing_decision,routing_reasons,processing_state
       ) values ($1,$2,$3,$4,'CONVERSATION_ENDED_OR_HANDOFF_READY',clock_timestamp(),
                 '{}'::jsonb,'CONTACTABLE','[]'::jsonb,'RECEIVED')`,
      [workspaceId, provider, eventId, conversationId],
    );

    await rawPool.query(
      `insert into crm_conversation_assignments (
         workspace_id,provider,conversation_id,assignee_subject_id,assignment_state,assigned_at,updated_at
       ) values ($1,$2,$3,$4,'ASSIGNED',clock_timestamp(),clock_timestamp())`,
      [workspaceId, provider, conversationId, rep],
    );

    await rawPool.query(
      `insert into crm_site_chat_access (
         workspace_id,conversation_id,access_token_hash,created_at,expires_at
       ) values ($1,$2,repeat('a',64),clock_timestamp(),clock_timestamp()+interval '10 minutes')`,
      [workspaceId, conversationId],
    );

    let accessSelectCount = 0;

    const wrappedPool = {
      async connect() {
        const client = await rawPool.connect();
        const originalQuery = client.query.bind(client);

        const wrappedClient = new Proxy(client, {
          get(target, prop, receiver) {
            if (prop !== "query") return Reflect.get(target, prop, receiver);

            return async (...args: unknown[]) => {
              const text = typeof args[0] === "string"
                ? args[0]
                : typeof args[0] === "object" && args[0] !== null && "text" in args[0]
                  ? String((args[0] as { text?: unknown }).text ?? "")
                  : "";

              const result = await (originalQuery as (...inner: unknown[]) => Promise<QueryResult>)(...args);

              if (
                /from\s+crm_site_chat_access/i.test(text) &&
                /expires_at\s*>\s*clock_timestamp\(\)/i.test(text)
              ) {
                accessSelectCount += 1;

                if (accessSelectCount === 2) {
                  assert.equal(result.rowCount, 1, "final access SELECT must have observed active access");

                  const revoked = await rawPool.query(
                    `delete from crm_site_chat_access
                      where workspace_id=$1 and conversation_id=$2`,
                    [workspaceId, conversationId],
                  );
                  assert.equal(revoked.rowCount, 1, "access must be revoked after final SELECT and before COMMIT");

                  const absent = await rawPool.query<{ count: string }>(
                    `select count(*)::text as count
                       from crm_site_chat_access
                      where workspace_id=$1 and conversation_id=$2`,
                    [workspaceId, conversationId],
                  );
                  assert.equal(absent.rows[0]?.count, "0", "revocation must be committed before final SELECT result reaches application");
                }
              }

              return result;
            };
          },
        });

        return wrappedClient as PoolClient;
      },
    } as unknown as Pool;

    const publication = publishSiteChatReply({
      pool: wrappedPool,
      workspaceId,
      provider,
      eventId,
      body: "This reply must not commit after thread access is revoked.",
      publishedBy: rep,
    });

    await assert.rejects(
      publication,
      /SITE_CHAT_REPLY_THREAD_NOT_ACTIVE/,
      "publication must fail if access is revoked after the final eligibility query but before COMMIT",
    );

    const count = await rawPool.query<{ count: string }>(
      `select count(*)::text as count
         from crm_site_chat_replies
        where workspace_id=$1 and conversation_id=$2 and delivery_state='PUBLISHED'`,
      [workspaceId, conversationId],
    );
    assert.equal(count.rows[0]?.count, "0", "revoked access must leave no committed reply");
  } finally {
    await rawPool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
