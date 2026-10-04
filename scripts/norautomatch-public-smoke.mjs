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

  if (path === "/") {
    result.hero = {
      liveSwipeMatch: body.includes("Live SwipeMatch"),
      fullDetails: body.includes("Full details"),
      garage: body.includes("Garage"),
      verifiedVin: body.includes("Verified VIN"),
      ridemotiveImage: body.includes("images.app.ridemotive.com"),
      sessionAlgorithm: body.includes("Exploring broadly") || body.includes("Adapting to this session"),
    };
    result.navigation = {
      signIn: body.includes("Sign in"),
      garage: body.includes("href=\"/garage\"") || body.includes("/garage"),
      brandedBadge: body.includes("data:image/webp;base64"),
      brandName: body.includes("NorAuto Match"),
    };
  }

  if (path === "/login") {
    result.authUi = {
      signInMode: body.includes("Sign in to NorAuto Match"),
      createAccountMode: body.includes("Create account"),
      createAccountLink: body.includes("mode=signup"),
      onePrimarySubmit: body.includes("Sign in") && !body.includes("Create my account"),
      resendRecovery: body.includes("Resend confirmation") || body.includes("Confirmation email not working?"),
    };
  }

  if (path === "/api/inventory" && response.ok) {
    const json = JSON.parse(body);
    const vehicles = Array.isArray(json.vehicles) ? json.vehicles : [];
    const vehiclesWithHttpImage = vehicles.filter((vehicle) => /^https:\/\//.test(String(vehicle.image || ""))).length;
    const ridemotiveImages = vehicles.filter((vehicle) => /^https:\/\/images\.app\.ridemotive\.com\//.test(String(vehicle.image || ""))).length;
    result.source = json.source;
    result.mode = json.effectiveMode;
    result.count = vehicles.length;
    result.vin = vehicles[0]?.id ?? null;
    result.images = {
      withHttpImage: vehiclesWithHttpImage,
      ridemotive: ridemotiveImages,
      coverage: vehicles.length > 0 ? vehiclesWithHttpImage / vehicles.length : 0,
    };
    result.evidence = json.sourceEvidence
      ? {
          rawHitCount: json.sourceEvidence.rawHitCount,
          normalizedCount: json.sourceEvidence.normalizedCount,
          eligibleCount: json.sourceEvidence.eligibleCount,
          rejectedCount: json.sourceEvidence.rejectedCount,
          inTransitCount: json.sourceEvidence.inTransitCount,
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
        containsRidemotiveImage: detail.body.includes("images.app.ridemotive.com"),
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

  if (result.path === "/") {
    if (!result.hero?.liveSwipeMatch || !result.hero?.fullDetails || !result.hero?.garage || !result.hero?.verifiedVin || !result.hero?.ridemotiveImage || !result.hero?.sessionAlgorithm) failed = true;
    if (!result.navigation?.signIn || !result.navigation?.garage || !result.navigation?.brandedBadge || !result.navigation?.brandName) failed = true;
  }

  if (result.path === "/login") {
    if (!result.authUi?.signInMode || !result.authUi?.createAccountMode || !result.authUi?.createAccountLink || !result.authUi?.onePrimarySubmit || !result.authUi?.resendRecovery) failed = true;
  }

  if (result.path === "/api/inventory") {
    if (result.source !== "orr-live" || result.mode !== "live-enabled") failed = true;
    if (!Number.isFinite(result.count) || result.count <= 0) failed = true;
    if (!result.evidence || result.evidence.rawHitCount < result.count) failed = true;
    if (!result.images || result.images.coverage < 0.9 || result.images.ridemotive <= 0) failed = true;
  }
}

if (failed) process.exitCode = 1;
