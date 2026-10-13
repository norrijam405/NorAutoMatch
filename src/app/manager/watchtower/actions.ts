"use server";

import { revalidatePath } from "next/cache";
import { requireNorAutoMembership } from "@/lib/supabase/authz";
import { createPostgresCrmPool } from "@/lib/crm-postgres-adapter";
import { parseTorqueSalesInventorySpec } from "@/lib/torque-sales-inventory-spec";
import { applyVehicleHuntCandidates, createVehicleHunt } from "@/lib/vehicle-hunt";
import { persistVehicleHunt, readVehicleHunt } from "@/lib/watchtower-persistence";

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
