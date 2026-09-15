const base = (process.env.NORAUTO_SMOKE_BASE_URL || "").replace(/\/$/, "");
if (!/^https:\/\//.test(base)) {
  throw new Error("NORAUTO_SMOKE_BASE_URL must be an https URL");
}

const paths = ["/", "/inventory", "/api/inventory", "/vehicles", "/login", "/account", "/garage", "/manager"];

async function hit(path) {
  const started = Date.now();
  const response = await fetch(`${base}${path}`, { redirect: "manual" });
  const body = await response.text();
  const result = {
    path,
    status: response.status,
    elapsedMs: Date.now() - started,
    location: response.headers.get("location"),
    contentType: response.headers.get("content-type"),
  };

  if (path === "/api/inventory" && response.ok) {
    const json = JSON.parse(body);
    result.source = json.source;
    result.mode = json.effectiveMode;
    result.count = Array.isArray(json.vehicles) ? json.vehicles.length : null;
    result.vin = json.vehicles?.[0]?.id ?? null;
    result.evidence = json.sourceEvidence
      ? {
          rawHitCount: json.sourceEvidence.rawHitCount,
          normalizedCount: json.sourceEvidence.normalizedCount,
          eligibleCount: json.sourceEvidence.eligibleCount,
          warningCount: json.sourceEvidence.warningCount,
          errorCount: json.sourceEvidence.errorCount,
        }
      : null;
  }

  return { result, body };
}

const settled = await Promise.allSettled(paths.map(hit));
const results = settled.map((entry, index) =>
  entry.status === "fulfilled"
    ? entry.value.result
    : { path: paths[index], error: entry.reason instanceof Error ? entry.reason.message : String(entry.reason) },
);

console.log(`NORAUTO_PUBLIC_SMOKE ${JSON.stringify({ base, results })}`);

const inventory = settled[paths.indexOf("/api/inventory")];
if (inventory?.status === "fulfilled") {
  const api = inventory.value.result;
  if (api.vin) {
    const detail = await hit(`/vehicles/${api.vin}`);
    console.log(
      `NORAUTO_VIN_SMOKE ${JSON.stringify({
        vin: api.vin,
        status: detail.result.status,
        elapsedMs: detail.result.elapsedMs,
        containsVin: detail.body.includes(api.vin),
        containsVerifiedLabel: detail.body.includes("Source-verified VIN"),
        containsEquipmentSection: detail.body.includes("Source-provided equipment"),
      })}`,
    );
  }
}

const expected = new Map([
  ["/", 200],
  ["/inventory", 200],
  ["/api/inventory", 200],
  ["/vehicles", 200],
  ["/login", 200],
]);

let failed = false;
for (const result of results) {
  if ("error" in result) {
    failed = true;
    continue;
  }
  if (expected.has(result.path) && result.status !== expected.get(result.path)) failed = true;
  if (["/account", "/garage", "/manager"].includes(result.path) && ![302, 303, 307, 308].includes(result.status)) failed = true;
}

if (failed) process.exitCode = 1;
