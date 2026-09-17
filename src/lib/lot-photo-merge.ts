export function mergeVehiclePhotoUrls(lotPhotos: string[], providerPhotos: string[], placeholder = "/images/vehicle-placeholder.jpg") {
  const merged = dedupePhotoUrls([...lotPhotos, ...providerPhotos].filter(Boolean));
  return merged.length > 0 ? merged : [placeholder];
}

export function dedupePhotoUrls(urls: string[]) {
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
