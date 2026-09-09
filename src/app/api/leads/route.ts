import { NextResponse } from "next/server";
import { buildCrmHandoffDelivery } from "@/lib/crm-handoff-delivery";
import { persistLeadAsCrmOpportunity } from "@/lib/crm-lead-intake";
import { createPostgresCrmPool, PostgresCrmPersistenceAdapter } from "@/lib/crm-postgres-adapter";
import { buildDeskPrepPacket } from "@/lib/desk-prep";
import { classifyLeadInventoryEvidence } from "@/lib/lead-inventory-evidence";
import { leadSchema } from "@/lib/lead-schema";
import { createManagerHandoff } from "@/lib/manager-handoff";
import { loadOrrCustomerCatalog } from "@/lib/orr-customer-catalog";

export const runtime = "nodejs";

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
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (isRateLimited(ip)) {
    return NextResponse.json({ message: "Too many requests. Call or text (405) 861-0061." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid request." }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
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
  const lead = {
    ...parsed.data,
    inventoryEvidence,
    submittedAt,
    pageUrl: request.headers.get("referer") || "unknown",
    userAgent: request.headers.get("user-agent") || "unknown",
  };

  const deskPrep = buildDeskPrepPacket({
    lead: parsed.data,
    inventoryEvidence,
    createdAt: submittedAt,
  });
  const managerHandoff = createManagerHandoff({ deskPrep, createdAt: submittedAt });
  const delivery = buildCrmHandoffDelivery({ lead, managerHandoff });

  const persistenceAdapter = getCrmPersistenceAdapter();
  if (!persistenceAdapter) {
    if (process.env.NODE_ENV === "production") {
      return NextResponse.json({ message: "Online routing is being connected. Call or text (405) 861-0061 for a direct response." }, { status: 503 });
    }
    return NextResponse.json({
      accepted: true,
      pipeline: lead.pipeline,
      inventoryEvidence: lead.inventoryEvidence.state,
      workflowState: managerHandoff.workflowState,
      handoffId: managerHandoff.handoffId,
      persistence: "SKIPPED_DEVELOPMENT_MODE",
      developmentMode: true,
    }, { status: 202 });
  }

  let crmIntake;
  try {
    crmIntake = await persistLeadAsCrmOpportunity({
      lead: parsed.data,
      inventoryEvidence,
      managerHandoff,
      submittedAt,
      adapter: persistenceAdapter,
    });
  } catch {
    return NextResponse.json({ message: "We could not safely save this request. Call or text (405) 861-0061." }, { status: 503 });
  }

  const webhook = process.env.CRM_WEBHOOK_URL;
  if (!webhook) {
    return NextResponse.json({
      accepted: true,
      pipeline: lead.pipeline,
      inventoryEvidence: lead.inventoryEvidence.state,
      workflowState: managerHandoff.workflowState,
      handoffId: managerHandoff.handoffId,
      opportunityId: crmIntake.opportunityId,
      persistence: crmIntake.persistenceStatus,
      delivery: "QUEUED",
    }, { status: 202 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(webhook, {
      method: "POST",
      headers: delivery.headers,
      body: JSON.stringify(delivery.payload),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return NextResponse.json({
        accepted: true,
        pipeline: lead.pipeline,
        inventoryEvidence: lead.inventoryEvidence.state,
        workflowState: managerHandoff.workflowState,
        handoffId: managerHandoff.handoffId,
        opportunityId: crmIntake.opportunityId,
        persistence: crmIntake.persistenceStatus,
        delivery: "QUEUED_AFTER_WEBHOOK_REJECTION",
      }, { status: 202 });
    }

    return NextResponse.json({
      accepted: true,
      pipeline: lead.pipeline,
      inventoryEvidence: lead.inventoryEvidence.state,
      workflowState: managerHandoff.workflowState,
      handoffId: managerHandoff.handoffId,
      opportunityId: crmIntake.opportunityId,
      persistence: crmIntake.persistenceStatus,
      delivery: "WEBHOOK_ACCEPTED",
    });
  } catch {
    return NextResponse.json({
      accepted: true,
      pipeline: lead.pipeline,
      inventoryEvidence: lead.inventoryEvidence.state,
      workflowState: managerHandoff.workflowState,
      handoffId: managerHandoff.handoffId,
      opportunityId: crmIntake.opportunityId,
      persistence: crmIntake.persistenceStatus,
      delivery: "QUEUED_AFTER_WEBHOOK_FAILURE",
    }, { status: 202 });
  }
}
