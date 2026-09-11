import { NextResponse } from "next/server";
import { persistLeadAsCrmOpportunity } from "@/lib/crm-lead-intake";
import { createPostgresCrmPool, PostgresCrmPersistenceAdapter } from "@/lib/crm-postgres-adapter";
import { buildDeskPrepPacket } from "@/lib/desk-prep";
import { classifyLeadInventoryEvidence } from "@/lib/lead-inventory-evidence";
import { leadSchema } from "@/lib/lead-schema";
import { createManagerHandoff } from "@/lib/manager-handoff";
import { loadOrrCustomerCatalog } from "@/lib/orr-customer-catalog";
import { readJsonBodyWithByteLimit } from "@/lib/request-body-limit";

export const runtime = "nodejs";

const MAX_LEAD_REQUEST_BYTES = 32 * 1024;
const requests = new Map<string, { count: number; expires: number }>();
let crmPool: ReturnType<typeof createPostgresCrmPool> | undefined;

function isRateLimited(ip: string) {
  const now = Date.now();
  const record = requests.get(ip);
  if (!record || record.expires < now) {
    requests.set(ip, { count: 1, expires: now + 10 * 60 * 1000 });
    return false;
  }
  record.count += 1;
  requests.set(ip, record);
  return record.count > 5;
}

function getCrmPersistenceAdapter() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if (!connectionString) return null;
  crmPool ??= createPostgresCrmPool(connectionString);
  return new PostgresCrmPersistenceAdapter(crmPool);
}

export async function POST(request: Request) {
  // This local limiter is development/defense-in-depth friction only. It is not
  // represented as durable or distributed production abuse protection.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ message: "Too many requests. Call or text (405) 861-0061." }, { status: 429 });
  }

  const bodyRead = await readJsonBodyWithByteLimit(request, MAX_LEAD_REQUEST_BYTES);
  if (!bodyRead.ok) {
    if (bodyRead.reason === "TOO_LARGE") {
      return NextResponse.json({ message: "Request is too large." }, { status: 413 });
    }
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(bodyRead.value);
  if (!parsed.success) {
    return NextResponse.json({ message: "Please check the highlighted fields.", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  let inventoryEvidence = classifyLeadInventoryEvidence({
    shortlistedVehicleIds: parsed.data.shortlistedVehicleIds,
  });

  if (parsed.data.shortlistedVehicleIds.length > 0) {
    try {
      const catalog = await loadOrrCustomerCatalog({
        mode: process.env.NORAUTO_INVENTORY_MODE,
        liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
      });
      inventoryEvidence = classifyLeadInventoryEvidence({
        shortlistedVehicleIds: parsed.data.shortlistedVehicleIds,
        catalog,
      });
    } catch {
      inventoryEvidence = classifyLeadInventoryEvidence({
        shortlistedVehicleIds: parsed.data.shortlistedVehicleIds,
        sourceUnavailable: true,
      });
    }
  }

  const submittedAt = new Date().toISOString();
  const deskPrep = buildDeskPrepPacket({
    lead: parsed.data,
    inventoryEvidence,
    createdAt: submittedAt,
  });
  const managerHandoff = createManagerHandoff({ deskPrep, createdAt: submittedAt });

  const persistenceAdapter = getCrmPersistenceAdapter();
  if (!persistenceAdapter) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ message: "Online routing is being connected. Call or text (405) 861-0061 for a direct response." }, { status: 503 });
    }
    return NextResponse.json({
      accepted: true,
      pipeline: parsed.data.pipeline,
      inventoryEvidence: inventoryEvidence.state,
      workflowState: managerHandoff.workflowState,
      handoffId: managerHandoff.handoffId,
      persistence: "SKIPPED_DEVELOPMENT_MODE",
      delivery: "NOT_ATTEMPTED_DEVELOPMENT_MODE",
      developmentMode: true,
    }, { status: 202 });
  }

  try {
    const crmIntake = await persistLeadAsCrmOpportunity({
      lead: parsed.data,
      inventoryEvidence,
      managerHandoff,
      submittedAt,
      adapter: persistenceAdapter,
    });

    return NextResponse.json({
      accepted: true,
      pipeline: parsed.data.pipeline,
      inventoryEvidence: inventoryEvidence.state,
      workflowState: managerHandoff.workflowState,
      handoffId: managerHandoff.handoffId,
      opportunityId: crmIntake.opportunityId,
      persistence: crmIntake.persistenceStatus,
      delivery: "QUEUED",
    }, { status: 202 });
  } catch {
    return NextResponse.json({ message: "We could not safely save this request. Call or text (405) 861-0061." }, { status: 503 });
  }
}
