import { NextResponse } from "next/server";
import { inventory } from "@/lib/inventory";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";
import { loadOrrResilientCustomerCatalog } from "@/lib/orr-resilient-customer-catalog";
import { buildMatchDnaSummary } from "@/lib/match-dna";
import { createClient } from "@/lib/supabase/server";
import { readJsonBodyWithByteLimit } from "@/lib/request-body-limit";
import { answerTorqueInventory, type TorqueInventoryMode } from "@/lib/torque-inventory-assistant";
import { parseTorqueSalesInventorySpec } from "@/lib/torque-sales-inventory-spec";
import { dealerInventorySearchAvailable, resolveDealershipScope } from "@/lib/dealership-scope";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TORQUE_REQUEST_BYTES = 8 * 1024;

function noStore(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, private",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(request: Request) {
  const bodyRead = await readJsonBodyWithByteLimit(request, MAX_TORQUE_REQUEST_BYTES);
  if (!bodyRead.ok) {
    return noStore(
      { message: bodyRead.reason === "TOO_LARGE" ? "That request is too large." : "I couldn't read that request safely." },
      bodyRead.reason === "TOO_LARGE" ? 413 : 400,
    );
  }

  const message =
    typeof bodyRead.value === "object" &&
    bodyRead.value !== null &&
    "message" in bodyRead.value &&
    typeof bodyRead.value.message === "string"
      ? bodyRead.value.message.trim()
      : "";

  if (!message || message.length > 1200) {
    return noStore({ message: "Tell Torque what you're looking for in 1,200 characters or fewer." }, 400);
  }

  const requestedDealership =
    typeof bodyRead.value === "object" && bodyRead.value !== null &&
    "dealershipId" in bodyRead.value
      ? bodyRead.value.dealershipId
      : "orr-nissan-west";
  const dealership = resolveDealershipScope(requestedDealership);
  if (!dealership) {
    return noStore({ message: "Select a recognized dealership before asking Torque to search its inventory.", truthState: "UNKNOWN_DEALERSHIP" }, 400);
  }
  if (!dealerInventorySearchAvailable(dealership)) {
    return noStore({
      protocol: "NORAUTO_TORQUE_SEARCH_V1",
      dealershipId: dealership.id,
      dealershipLabel: dealership.label,
      truthState: "DEALERSHIP_INVENTORY_NOT_CONNECTED",
      message: "The Irving Hyundai dealership has not been confirmed or connected to a verified inventory source. I cannot search its stock or claim whether it has a vehicle. A salesperson can review your request manually after the dealership is confirmed.",
      matches: [],
      canCreateSourcingRequest: false,
    }, 200);
  }

  const runtimeDecision = resolveInventoryRuntime({
    mode: process.env.NORAUTO_INVENTORY_MODE,
    liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
  });

  let vehicles = inventory;
  let mode: TorqueInventoryMode = "representative-demo";

  if (runtimeDecision.effectiveMode === "live-enabled") {
    try {
      const catalog = await loadOrrResilientCustomerCatalog({
        mode: process.env.NORAUTO_INVENTORY_MODE,
        liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
      });
      vehicles = catalog.vehicles;
      mode = catalog.source === "provider-cache" ? "verified-cache" : "verified-live";
    } catch {
      return noStore({
        protocol: "NORAUTO_TORQUE_SEARCH_V1",
        truthState: "VERIFIED_SOURCE_UNAVAILABLE",
        message: "I can't verify fresh inventory right now, so I'm not going to make up an answer. I can still capture exactly what you want for a human sourcing check.",
        canCreateSourcingRequest: true,
      }, 503);
    }
  }

  const spec = parseTorqueSalesInventorySpec(message);
  const hasSearchSignal = Boolean(
    spec.make ||
    spec.model ||
    spec.modelYear ||
    spec.trim ||
    spec.condition ||
    spec.maxPrice ||
    spec.maxMileage ||
    spec.exteriorColor ||
    spec.interiorColor ||
    spec.interiorMaterial ||
    spec.drivetrain ||
    spec.cabStyle ||
    spec.bedLength ||
    spec.seatingCapacity ||
    spec.engine ||
    spec.transmission ||
    spec.fuelType ||
    spec.towingMinimumLbs ||
    spec.payloadMinimumLbs ||
    spec.packages.length ||
    spec.features.length ||
    spec.exclusions.length
  );

  if (!hasSearchSignal) {
    return noStore({
      protocol: "NORAUTO_TORQUE_SEARCH_V1",
      truthState: mode === "representative-demo" ? "REPRESENTATIVE_ONLY" : "VERIFIED_INVENTORY_READY",
      mode,
      needsMoreDetail: true,
      answer: "Tell me what you actually need in the vehicle. Model or body style is a good start, then give me the must-haves — color, drivetrain, cab or bed, seats, features, budget, whatever matters. I won't quietly drop a requirement just to force a match.",
      spec,
      matches: [],
    });
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;

  let dna;
  if (userId) {
    const { data: dnaEvents } = await supabase
      .from("match_dna_events")
      .select("action,make,body_type,drivetrain,condition,price,mileage")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(250);
    dna = buildMatchDnaSummary(dnaEvents ?? []);
  }

  const result = answerTorqueInventory({ message, vehicles, mode, dna, spec });

  return noStore({
    protocol: "NORAUTO_TORQUE_SEARCH_V1",
    truthState: mode === "representative-demo" ? "REPRESENTATIVE_ONLY" : "VERIFIED_CURRENT_SCOPE",
    needsMoreDetail: false,
    ...result,
    salesSpec: spec,
    matchDna: dna ?? null,
  });
}
