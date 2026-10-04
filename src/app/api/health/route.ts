import { NextResponse } from "next/server";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";

export const dynamic = "force-dynamic";

function resolveReleaseSha() {
  // Render supplies RENDER_GIT_COMMIT at runtime for the exact deployed Git commit.
  // Prefer the platform-provided identity so a stale manually maintained value cannot
  // make a new deployment report the previous release. Local/CI/container runs retain
  // the explicit NORAUTO_RELEASE_SHA fallback for deterministic verification.
  return process.env.RENDER_GIT_COMMIT?.trim() || process.env.NORAUTO_RELEASE_SHA?.trim() || "UNSET";
}

export async function GET() {
  const runtime = resolveInventoryRuntime({
    mode: process.env.NORAUTO_INVENTORY_MODE,
    liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
  });

  const releaseSha = resolveReleaseSha();

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
