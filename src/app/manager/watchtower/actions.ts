"use server";

import { revalidatePath } from "next/cache";
import { requireNorAutoMembership } from "@/lib/supabase/authz";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { parseTorqueSalesInventorySpec } from "@/lib/torque-sales-inventory-spec";
import { applyVehicleHuntCandidates, createVehicleHunt } from "@/lib/vehicle-hunt";
import { persistVehicleHunt, readVehicleHunt } from "@/lib/watchtower-persistence";
import { loadOrrResilientCustomerCatalog } from "@/lib/orr-resilient-customer-catalog";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";
import { matchVehicleHuntToLocalInventory } from "@/lib/vehicle-hunt-inventory-matcher";

let watchtowerPool: ReturnType<typeof createPostgresCrmPool> | undefined;

function getPool() {
  const connectionString = process.env.NORAUTO_CRM_DATABASE_URL?.trim();
  if (!connectionString) throw new Error("WATCHTOWER_DATABASE_NOT_CONFIGURED");
  watchtowerPool ??= createPostgresCrmPool(connectionString);
  return watchtowerPool;
}

export type FreshUpHuntActionState = {
  ok: boolean;
  message: string;
  huntId?: string;
};

export async function createFreshUpVehicleHunt(
  _previousState: FreshUpHuntActionState,
  formData: FormData,
): Promise<FreshUpHuntActionState> {
  const { userId } = await requireNorAutoMembership(["operator", "admin", "founder"], "/manager/watchtower");

  const request = String(formData.get("request") ?? "").trim();
  const consentToContact = formData.get("consentToContact") === "on";

  if (request.length < 4 || request.length > 1200) {
    return { ok: false, message: "Give Torque a clear vehicle request between 4 and 1,200 characters." };
  }

  const requirements = parseTorqueSalesInventorySpec(request);
  const hunt = createVehicleHunt({
    workspaceId: "norautomatch",
    origin: "FRESH_UP",
    requirements,
    explicitCustomerText: request,
    consentToContact,
    salespersonOwner: userId,
  });

  try {
    await persistVehicleHunt({ pool: getPool(), hunt });
  } catch (error) {
    console.error(
      "NORAUTO_WATCHTOWER_HUNT_PERSIST_FAILED",
      error instanceof Error ? error.message : String(error),
    );
    return {
      ok: false,
      message: "The Hunt could not be saved safely. The Watchtower database migration may not be active yet.",
    };
  }

  revalidatePath("/manager/watchtower");
  return {
    ok: true,
    message: "Vehicle Hunt saved. Torque can now keep this request alive in Watchtower.",
    huntId: hunt.huntId,
  };
}


export async function refreshVehicleHunt(formData: FormData) {
  await requireNorAutoMembership(["operator", "admin", "founder"], "/manager/watchtower");

  const huntId = String(formData.get("huntId") ?? "").trim();
  if (!/^namvh_[0-9a-f]{24}$/.test(huntId)) throw new Error("INVALID_VEHICLE_HUNT_ID");

  const pool = getPool();
  const hunt = await readVehicleHunt({ pool, workspaceId: "norautomatch", huntId });
  if (!hunt) throw new Error("VEHICLE_HUNT_NOT_FOUND");

  const runtime = resolveInventoryRuntime({
    mode: process.env.NORAUTO_INVENTORY_MODE,
    liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
  });
  if (runtime.effectiveMode !== "live-enabled") throw new Error("VERIFIED_INVENTORY_NOT_ENABLED");

  const catalog = await loadOrrResilientCustomerCatalog({
    mode: process.env.NORAUTO_INVENTORY_MODE,
    liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
  });

  const observedAt = new Date().toISOString();
  const candidates = matchVehicleHuntToLocalInventory({
    requirements: hunt.requirements,
    vehicles: catalog.vehicles,
    observedAt,
    sourceLabel: catalog.source === "provider-cache"
      ? "Orr Nissan West verified cache"
      : "Orr Nissan West verified live",
  });

  const updated = applyVehicleHuntCandidates({ hunt, candidates, observedAt });
  await persistVehicleHunt({ pool, hunt: updated });
  revalidatePath("/manager/watchtower");
}
