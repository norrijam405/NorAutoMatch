import { createPostgresCrmPool } from "./crm-postgres-adapter";
import { NORAUTO_WORKSPACE_ID } from "./crm-persistence";
import { authorizeManagerSession, type ManagerSessionAuthResult } from "./manager-session-auth";
import { enforceDurableManagerSessionRevocation } from "./manager-session-durable-auth";

let managerAuthPool: ReturnType<typeof createPostgresCrmPool> | undefined;

export async function authorizeManagerRequest(request: Request): Promise<ManagerSessionAuthResult> {
  const auth = authorizeManagerSession({
    authorizationHeader: request.headers.get("authorization"),
    configuredSecret: process.env.NORAUTO_MANAGER_SESSION_SECRET,
    expectedWorkspaceId: NORAUTO_WORKSPACE_ID,
  });
  if (!auth.authorized) return auth;

  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if (!connectionString) return { authorized: false, reason: "NOT_CONFIGURED" };
  managerAuthPool ??= createPostgresCrmPool(connectionString);

  const durable = await enforceDurableManagerSessionRevocation({ pool: managerAuthPool, auth });
  if (!durable.authorized && durable.reason === "REVOCATION_CHECK_FAILED") {
    return { authorized: false, reason: "NOT_CONFIGURED" };
  }
  return durable as ManagerSessionAuthResult;
}
