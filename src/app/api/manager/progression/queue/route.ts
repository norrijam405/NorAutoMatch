import { NextResponse } from "next/server";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { readAppointmentConfirmationQueue } from "@/lib/crm-appointment-queue";
import { authorizeManagerRequest } from "@/lib/manager-route-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let appointmentQueuePool: ReturnType<typeof createPostgresCrmPool> | undefined;

function noStore(body: Record<string, unknown>, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function GET(request: Request) {
  const auth = await authorizeManagerRequest(request);
  if (!auth.authorized) {
    if (auth.reason === "NOT_CONFIGURED") return noStore({ message: "Manager identity verification is not configured." }, 503);
    return noStore({ message: "Unauthorized." }, 401);
  }

  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if (!connectionString) return noStore({ message: "Appointment queue dependency is not configured." }, 503);

  const url = new URL(request.url);
  const requestedLimit = Number.parseInt(url.searchParams.get("limit") ?? "50", 10);
  const limit = Number.isFinite(requestedLimit) ? requestedLimit : 50;
  appointmentQueuePool ??= createPostgresCrmPool(connectionString);

  try {
    const items = await readAppointmentConfirmationQueue({
      pool: appointmentQueuePool,
      workspaceId: auth.claims.workspaceId,
      limit,
    });
    return noStore({
      protocol: "NORAUTO_APPOINTMENT_QUEUE_RESPONSE_V1",
      truthState: "READ_MODEL_ONLY",
      authorityEffect: "NONE",
      items,
    }, 200);
  } catch {
    return noStore({ message: "Appointment confirmation queue is unavailable." }, 503);
  }
}
