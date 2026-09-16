import { HomeHeroSwipe } from "@/components/inventory/home-hero-swipe";
import type { Vehicle } from "@/lib/inventory";
import { resolveInventoryRuntime } from "@/lib/inventory-runtime";
import { loadOrrResilientCustomerCatalog } from "@/lib/orr-resilient-customer-catalog";

const HERO_DECK_SIZE = 16;

export async function HomeHeroSwipeShell() {
  const runtime = resolveInventoryRuntime({
    mode: process.env.NORAUTO_INVENTORY_MODE,
    liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
  });

  if (runtime.effectiveMode !== "live-enabled") {
    return <HomeHeroSwipe vehicles={[]} sourceLabel="Inventory verification pending" sourceCount={0} />;
  }

  let catalog: Awaited<ReturnType<typeof loadOrrResilientCustomerCatalog>> | null = null;

  try {
    catalog = await loadOrrResilientCustomerCatalog({
      mode: process.env.NORAUTO_INVENTORY_MODE,
      liveActivation: process.env.NORAUTO_LIVE_INVENTORY_ACTIVATION,
    });
  } catch (error) {
    console.error("NORAUTO_HOME_HERO_SWIPE_FAILED", error instanceof Error ? error.message : String(error));
  }

  if (!catalog) {
    return <HomeHeroSwipe vehicles={[]} sourceLabel="Inventory verification pending" sourceCount={0} />;
  }

  const vehicles = buildDiverseHeroDeck(catalog.vehicles.filter((vehicle) => vehicle.image), HERO_DECK_SIZE);
  const sourceCount = catalog.sourceEvidence?.rawHitCount ?? catalog.vehicles.length;
  const inTransitCount = catalog.sourceEvidence?.inTransitCount ?? 0;
  const sourceLabel = catalog.source === "provider-cache" ? "Verified cached inventory" : "Verified live inventory";

  return <HomeHeroSwipe vehicles={vehicles} sourceLabel={sourceLabel} sourceCount={sourceCount} inTransitCount={inTransitCount} />;
}

function buildDiverseHeroDeck(vehicles: Vehicle[], limit: number) {
  if (vehicles.length <= limit) return shuffled(vehicles);

  const pool = shuffled(vehicles);
  const selected: Vehicle[] = [];
  const makeCounts = new Map<string, number>();
  const modelCounts = new Map<string, number>();
  const typeCounts = new Map<string, number>();
  const conditionCounts = new Map<string, number>();
  let transitCount = 0;

  while (selected.length < limit && pool.length > 0) {
    let bestIndex = 0;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let index = 0; index < pool.length; index += 1) {
      const vehicle = pool[index];
      const makeKey = vehicle.make.toLowerCase();
      const modelKey = `${vehicle.make}:${vehicle.model}`.toLowerCase();
      const typeKey = vehicle.type.toLowerCase();
      const conditionKey = vehicle.condition?.toLowerCase() || "unknown";

      const score =
        (modelCounts.get(modelKey) ?? 0) * 20 +
        (makeCounts.get(makeKey) ?? 0) * 5 +
        (typeCounts.get(typeKey) ?? 0) * 3 +
        (conditionCounts.get(conditionKey) ?? 0) * 0.75 +
        (vehicle.inTransit ? transitCount * 0.5 : 0) +
        Math.random();

      if (score < bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    }

    const [vehicle] = pool.splice(bestIndex, 1);
    selected.push(vehicle);
    const makeKey = vehicle.make.toLowerCase();
    const modelKey = `${vehicle.make}:${vehicle.model}`.toLowerCase();
    const typeKey = vehicle.type.toLowerCase();
    const conditionKey = vehicle.condition?.toLowerCase() || "unknown";
    makeCounts.set(makeKey, (makeCounts.get(makeKey) ?? 0) + 1);
    modelCounts.set(modelKey, (modelCounts.get(modelKey) ?? 0) + 1);
    typeCounts.set(typeKey, (typeCounts.get(typeKey) ?? 0) + 1);
    conditionCounts.set(conditionKey, (conditionCounts.get(conditionKey) ?? 0) + 1);
    if (vehicle.inTransit) transitCount += 1;
  }

  return selected;
}

function shuffled<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}
