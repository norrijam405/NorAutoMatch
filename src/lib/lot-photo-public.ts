import { createClient } from "@/lib/supabase/server";

const BUCKET = "vehicle-lot-photos";
const VIN_RE = /^[A-HJ-NPR-Z0-9]{17}$/;
const MAX_LOT_PHOTOS = 30;

export type PublicLotPhotoResult = {
  urls: string[];
  source: "lot-photo-overrides" | "none";
};

export async function loadActiveLotPhotoUrls(vinInput: string): Promise<PublicLotPhotoResult> {
  const vin = vinInput.trim().toUpperCase();
  if (!VIN_RE.test(vin)) return { urls: [], source: "none" };

  try {
    const supabase = await createClient();
    const { data: rows, error } = await supabase
      .from("vehicle_photo_overrides")
      .select("storage_path,is_cover,sort_order,created_at")
      .eq("vin", vin)
      .eq("active", true)
      .order("is_cover", { ascending: false })
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true })
      .limit(MAX_LOT_PHOTOS);

    if (error) {
      console.error("NORAUTO_PUBLIC_LOT_PHOTO_READ_FAILED", error.message);
      return { urls: [], source: "none" };
    }

    const urls = (rows ?? [])
      .map((row) => row.storage_path?.trim())
      .filter((path): path is string => Boolean(path))
      .map((path) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl)
      .filter(Boolean);

    return urls.length > 0
      ? { urls: dedupePhotoUrls(urls), source: "lot-photo-overrides" }
      : { urls: [], source: "none" };
  } catch (error) {
    console.error("NORAUTO_PUBLIC_LOT_PHOTO_READ_FAILED", error instanceof Error ? error.message : String(error));
    return { urls: [], source: "none" };
  }
}

export function mergeVehiclePhotoUrls(lotPhotos: string[], providerPhotos: string[], placeholder = "/images/vehicle-placeholder.jpg") {
  const merged = dedupePhotoUrls([...lotPhotos, ...providerPhotos].filter(Boolean));
  return merged.length > 0 ? merged : [placeholder];
}

function dedupePhotoUrls(urls: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of urls) {
    const url = raw.trim();
    if (!url) continue;
    const key = normalizeUrlForDedupe(url);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(url);
  }
  return result;
}

function normalizeUrlForDedupe(value: string) {
  try {
    const url = new URL(value);
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
}
