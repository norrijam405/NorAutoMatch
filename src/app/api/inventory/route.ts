import { NextResponse } from "next/server";
import { loadOrrCustomerCatalog } from "@/lib/orr-customer-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalog = await loadOrrCustomerCatalog({
      mode: process.env.NORAUTO_INVENTORY_MODE,
      liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
    });

    const cacheControl = catalog.source === "orr-live"
      ? "public, max-age=0, s-maxage=300, stale-while-revalidate=60"
      : "public, max-age=0, s-maxage=60";

    return NextResponse.json(catalog, {
      status: 200,
      headers: {
        "Cache-Control": cacheControl,
        "X-NorAuto-Inventory-Mode": catalog.effectiveMode,
        "X-NorAuto-Inventory-Source": catalog.source,
      },
    });
  } catch {
    return NextResponse.json(
      {
        error: "LIVE_INVENTORY_UNAVAILABLE",
        message: "Live inventory could not be verified. No demonstration fallback was substituted.",
      },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-NorAuto-Inventory-Mode": "live-enabled",
          "X-NorAuto-Inventory-Source": "unavailable",
        },
      },
    );
  }
}
