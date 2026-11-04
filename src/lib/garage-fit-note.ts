import type { Vehicle } from "./inventory";

/** Transparent, VIN-backed guidance. Never infer a stated requirement from a save. */
export function garageFitNote(vehicle: Vehicle | undefined, saved: Vehicle[]) {
  if (!vehicle) return "We kept this VIN in your Garage, but current dealer details are unavailable. We cannot assess its fit yet.";
  const peers = saved.filter(v => v.id !== vehicle.id);
  const sameBody = peers.filter(v => v.type.toLowerCase() === vehicle.type.toLowerCase());
  if (sameBody.length >= 2) return `You've saved several ${vehicle.type.toLowerCase()} vehicles, including this one. That may be a style you're exploring—not a confirmed requirement.`;

  const peerMpg = peers.filter(v => typeof v.cityMpg === "number" && v.cityMpg > 0);
  if (typeof vehicle.cityMpg === "number" && vehicle.cityMpg > 0 && peerMpg.length >= 2) {
    const avg = peerMpg.reduce((s,v) => s + v.cityMpg!, 0) / peerMpg.length;
    if (vehicle.cityMpg < avg - 2) return `Fuel economy tradeoff: this one lists ${vehicle.cityMpg} city MPG, below the ${Math.round(avg)} MPG average of your other saved vehicles with reported ratings. That doesn't mean fuel economy is a firm requirement for you.`;
    if (vehicle.cityMpg > avg + 2) return `Potential fuel economy advantage: this one lists ${vehicle.cityMpg} city MPG, above the ${Math.round(avg)} MPG average of your other saved vehicles with reported ratings.`;
  }

  const peerPrices = peers.filter(v => Number.isFinite(v.price) && v.price > 0).map(v=>v.price);
  if (peerPrices.length >= 2 && Number.isFinite(vehicle.price) && vehicle.price > 0) {
    const sorted = peerPrices.sort((a,b)=>a-b);
    const middle = Math.floor(sorted.length/2);
    const midpoint = sorted.length%2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2;
    if (vehicle.price > midpoint + 2500) return `Price tradeoff: this vehicle is listed at $${vehicle.price.toLocaleString("en-US")}, above the $ ${Math.round(midpoint).toLocaleString("en-US")} midpoint of your other saved vehicles. A save isn't a declared budget.`.replace("$ ","$");
    if (vehicle.price < midpoint - 2500) return `Price advantage: this vehicle is listed at $${vehicle.price.toLocaleString("en-US")}, below the $${Math.round(midpoint).toLocaleString("en-US")} midpoint of your other saved vehicles.`;
  }
  return "You saved this vehicle for a closer look. We can compare verified specs, but we don't yet know which features matter most to you.";
}
