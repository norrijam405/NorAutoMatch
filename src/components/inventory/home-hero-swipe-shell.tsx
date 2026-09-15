import { HomeHeroSwipe } from "@/components/inventory/home-hero-swipe";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";
import { loadOrrResilientCustomerCatalog } from "@/lib/orr-resilient-customer-catalog";

export async function HomeHeroSwipeShell() {
  const runtime = resolveInventoryRuntime({
    mode: process.env.NORAUTO_INVENTORY_MODE,
    liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
  });

  if (runtime.effectiveMode !== "live-enabled") {
    return <HomeHeroSwipe vehicles={[]} sourceLabel="Inventory verification pending" sourceCount={0} />;
  }

  try {
    const catalog = await loadOrrResilientCustomerCatalog({
      mode: process.env.NORAUTO_INVENTORY_MODE,
      liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
    });
    const vehicles = catalog.vehicles.filter((vehicle) => vehicle.image).slice(0, 12);
    const sourceCount = catalog.sourceEvidence?.rawHitCount ?? catalog.vehicles.length;
    const inTransitCount = catalog.sourceEvidence?.inTransitCount ?? 0;
    const sourceLabel = catalog.source === "provider-cache" ? "Verified cached inventory" : "Verified live inventory";

    return <HomeHeroSwipe vehicles={vehicles} sourceLabel={sourceLabel} sourceCount={sourceCount} inTransitCount={inTransitCount} />;
  } catch (error) {
    console.error("NORAUTO_HOME_HERO_SWIPE_FAILED", error instanceof Error ? error.message : String(error));
    return <HomeHeroSwipe vehicles={[]} sourceLabel="Inventory verification pending" sourceCount={0} />;
  }
}
