import type { Vehicle } from "./inventory";

export function interpretLifestyleSearch(query: string) {
  const normalized = query.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const teen = /\b(teen|teenager|teenage|new driver|first car|young driver)\b/.test(normalized);
  const small = /\b(small|compact|little|easy to park)\b/.test(normalized);
  const sedan = /\b(sedan|four door|4 door)\b/.test(normalized);
  return teen && sedan ? { teen, small, sedan } : null;
}

/** Advisory shortlist, never a safety rating, crash-test assessment, or guarantee of suitability. */
export function lifestyleSedanCandidates(vehicles: Vehicle[], query: string) {
  const intent = interpretLifestyleSearch(query);
  if (!intent) return [];
  const compactModels = new Set(["versa", "sentra", "corolla", "civic", "elantra", "forte", "rio", "mazda3", "impreza", "jetta"]);
  return vehicles
    .filter((v) => /sedan/i.test(v.type) || /sedan/i.test(v.trim))
    .map((vehicle) => {
      const compact = compactModels.has(vehicle.model.toLowerCase().replace(/[^a-z0-9]/g, ""));
      const score = (compact ? 100 : 0) + (Number.isFinite(vehicle.price) ? Math.max(0, 60000 - vehicle.price) / 1000 : 0);
      return { vehicle, compact, score };
    })
    .sort((a, b) => b.score - a.score || a.vehicle.id.localeCompare(b.vehicle.id))
    .slice(0, 8);
}
