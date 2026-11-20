/** Exact official dealer URL check. No customer-supplied host is ever fetched. */
export function explicitOrrListing(message: string): { url: string; vin: string; title: string } | null {
  const candidate = message.match(/https?:\/\/[^\s<>"']+/i)?.[0]?.replace(/[),.!?]+$/, "");
  if (!candidate) return null;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "https:" || parsed.hostname !== "orrnissanwest.com" ||
      parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash) return null;
    const path = parsed.pathname.match(/^\/inventory\/(New|Used|Certified)-(20\d{2})-([A-Za-z0-9_-]+)-([A-HJ-NPR-Z0-9]{17})\/?$/i);
    if (!path) return null;
    return { url: parsed.origin + parsed.pathname, vin: path[4].toUpperCase(), title: path[3].replace(/[-_]/g, " ") };
  } catch { return null; }
}

/** A verified page is NOT proof of stock, trim, features, or a final price. */
export async function checkExplicitOrrListing(url: string, vin: string):
  Promise<"PAGE_VERIFIED" | "PAGE_NOT_VERIFIED"> {
  // Independently validate URL and identity, even if another caller bypasses the parser.
  const parsed = explicitOrrListing(url);
  if (!parsed || parsed.url !== url || parsed.vin !== vin.toUpperCase()) return "PAGE_NOT_VERIFIED";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(parsed.url, {
      redirect: "error", cache: "no-store", signal: controller.signal,
      headers: { Accept: "text/html", "User-Agent": "NorAutoMatch-Torque-Scout/1.0 (read-only dealer link check)" },
    });
    if (!response.ok || !/^text\/html/i.test(response.headers.get("content-type") ?? "") ||
      Number(response.headers.get("content-length") ?? 0) > 800000) return "PAGE_NOT_VERIFIED";
    const html = await response.text();
    if (html.length > 800000) return "PAGE_NOT_VERIFIED";
    const title = html.match(/<title[^>]*>([^<]{1,250})<\/title>/i)?.[1] ?? "";
    // A generic page containing the requested VIN (e.g. recommendations/footer)
    // is not enough: title must corroborate the expected year and model family.
    const segments = parsed.url.match(/\/inventory\/(?:New|Used|Certified)-(20\d{2})-([^-]+)-([^-]+)-/i);
    if (!segments || !title.includes(segments[1]) ||
        !title.toLowerCase().includes(segments[3].toLowerCase()) ||
        !html.toUpperCase().includes(parsed.vin)) return "PAGE_NOT_VERIFIED";
    return "PAGE_VERIFIED";
  } catch { return "PAGE_NOT_VERIFIED"; }
  finally { clearTimeout(timer); }
}
