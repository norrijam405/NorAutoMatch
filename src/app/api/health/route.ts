import { NextResponse } from "next/server";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const runtime = resolveInventoryRuntime({
    mode: process.env.NORAUTO_INVENTORY_MODE,
    liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
  });

  const releaseSha = process.env.NORAUTO_RELEASE_SHA?.trim() || "UNSET";

  return NextResponse.json(
    {
      service: "norauto-match",
      status: "SERVING",
      releaseSha,
      inventory: {
        effectiveMode: runtime.effectiveMode,
        customerVisibleLiveInventory: runtime.customerVisibleLiveInventory,
      },
      truthScope: "PUBLIC_SERVING_HEALTH_ONLY",
      authorityEffect: "NONE",
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
