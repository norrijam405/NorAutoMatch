import type { Vehicle } from "./inventory";
import { parseListingMpg } from "./torque-dealer-description-scout";

const VIN = /^[A-HJ-NPR-Z0-9]{17}$/i;
const ROOT = "https://orrnissanwest.com/inventory/";
const cache = new Map<string, {expiresAt:number;vehicle:Vehicle}>();
const trim = (value:string) => value.trim().replace(/\s+/g,"-").replace(/[^A-Za-z0-9-]/g,"");
function publicDetailUrl(v: Vehicle): string | null {
  if (!VIN.test(v.id) || !Number.isInteger(v.year) || v.year < 1984 ||
      !v.make || !v.model || !v.trim || !/^(New|Used|Certified)$/i.test(v.condition ?? "")) return null;
  const condition = /^new$/i.test(v.condition!) ? "New" : "Used";
  return ROOT + [condition,String(v.year),v.make,v.model,v.trim,v.id].map(trim).join("-");
}
/**
 * Optional VIN-verified details from a public Orr vehicle page. Never visit
 * user-supplied hosts, follow redirects, infer availability, or change price.
 * Failed or ambiguous lookups return the original vehicle unchanged.
 */
export async function scoutOrrPublicVinDetails(vehicle: Vehicle): Promise<Vehicle> {
  const url = publicDetailUrl(vehicle);
  if (!url) return vehicle;
  const cached=cache.get(vehicle.id);
  if (cached && cached.expiresAt>Date.now()) return cached.vehicle;
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),3500);
  try {
    const response=await fetch(url,{redirect:"error",cache:"no-store",signal:controller.signal,
      headers:{Accept:"text/html", "User-Agent":"NorAutoMatch-Torque-Scout/1.0 (read-only Orr detail verification)"}});
    if(!response.ok || !/^text\/html/i.test(response.headers.get("content-type")??"")) return vehicle;
    if(Number(response.headers.get("content-length")??0)>800000) return vehicle;
    const html=await response.text();
    if(html.length>800000) return vehicle;
    const rawTitle=html.match(/<title[^>]*>([^<]{1,250})<\/title>/i)?.[1]??"";
    if(!rawTitle.includes(String(vehicle.year)) ||
       !rawTitle.toLowerCase().includes(vehicle.make.toLowerCase()) ||
       !rawTitle.toLowerCase().includes(vehicle.model.toLowerCase()) ||
       !html.toUpperCase().includes(vehicle.id.toUpperCase())) return vehicle;
    const plain=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ")
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ")
      .replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/\s+/g," ");
    const sectionStart=plain.indexOf("Vehicle Specification");
    // Do not let unrelated recommendations elsewhere on the page contaminate
    // exact VIN evidence.
    const scoped=sectionStart>=0 ? plain.slice(sectionStart,sectionStart+6000) : "";
    const data=parseListingMpg(scoped);
    const featureStart=scoped.indexOf("Features");
    const featureEnd=featureStart>=0 ? scoped.indexOf("Hours",featureStart) : -1;
    const featureSection=featureStart>=0&&featureEnd>featureStart
      ? scoped.slice(featureStart,featureEnd).slice(0,3000) : "";
    const exactFeatures=[
      "Leather Seats","Cloth Seats","Heated Seats","Sunroof","Moonroof",
      "Apple CarPlay","Android Auto","Remote Start","Power Seats",
    ].filter(label=>new RegExp("\\b"+label.replace(/ /g,"\\s+")+"\\b","i").test(featureSection));
    const meta=html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']{1,400})["']/i)?.[1];
    const resolved: Vehicle = {
      ...vehicle,
      cityMpg: vehicle.cityMpg ?? data?.city,
      highwayMpg: vehicle.highwayMpg ?? data?.highway,
      mpgEvidenceBasis: vehicle.mpgEvidenceBasis ?? (data ? "DEALER_DETAIL" : undefined),
      features: [...new Set([...(vehicle.features??[]),...exactFeatures])],
      description: vehicle.description ?? meta,
    };
    cache.set(vehicle.id,{expiresAt:Date.now()+10*60*1000,vehicle:resolved});
    if(cache.size>200) cache.delete(cache.keys().next().value!);
    return resolved;
  } catch {
    return vehicle;
  } finally {clearTimeout(timer);}
}
