import { NextResponse } from "next/server";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";
import { loadOrrResilientCustomerCatalog } from "@/lib/orr-resilient-customer-catalog";

const MWMM_PREVIEW_ORIGIN = "https://mwmm-design-preview-r0.igniaquaai.workers.dev";
function corsHeaders(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new Set([MWMM_PREVIEW_ORIGIN, ...(process.env.MWMM_ALLOWED_ORIGINS ?? "").split(",").map((value) => value.trim()).filter(Boolean)]);
  const headers = new Headers({ "Vary": "Origin", "Access-Control-Allow-Methods": "GET, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" });
  if (origin && allowed.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
  return headers;
}
export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}
export async function GET(request: Request) {
  const runtimeDecision = resolveInventoryRuntime({ mode: process.env.NORAUTO_INVENTORY_MODE, liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION });
  if (runtimeDecision.effectiveMode !== "live-enabled") {
    return NextResponse.json({ error: "VERIFIED_INVENTORY_NOT_ENABLED", message: "Verified dealer inventory is not currently enabled." }, { status: 503, headers: { ...Object.fromEntries(corsHeaders(request)), "Cache-Control": "no-store", "X-NorAuto-Inventory-Source": "unavailable" } });
  }
  try {
    const catalog = await loadOrrResilientCustomerCatalog({
      mode: process.env.NORAUTO_INVENTORY_MODE,
      liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
    });

    if (!catalog.customerVisibleLiveInventory || catalog.source === "demo") throw new Error("UNVERIFIED_INVENTORY_CATALOG");
    const cacheControl = catalog.source === "provider-cache"
      ? "public, max-age=0, s-maxage=300, stale-while-revalidate=60"
      : "public, max-age=0, s-maxage=60, stale-while-revalidate=30";

    return NextResponse.json(catalog, {
      status: 200,
      headers: {
        ...Object.fromEntries(corsHeaders(request)),
        "Cache-Control": cacheControl,
        "X-NorAuto-Inventory-Mode": catalog.effectiveMode,
        "X-NorAuto-Inventory-Source": catalog.source,
      },
    });
  } catch (error) {
    console.error("NORAUTO_INVENTORY_API_LOAD_FAILED", error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      {
        error: "LIVE_INVENTORY_UNAVAILABLE",
        message: "Live inventory could not be verified from either the durable cache or the bounded dealer source. No demonstration fallback was substituted.",
      },
      {
        status: 503,
        headers: {
          ...Object.fromEntries(corsHeaders(request)),
          "Cache-Control": "no-store",
          "X-NorAuto-Inventory-Mode": "live-enabled",
          "X-NorAuto-Inventory-Source": "unavailable",
        },
      },
    );
  }
}
