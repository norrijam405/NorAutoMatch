const baseArg = process.argv[2]?.trim();
if (!baseArg) {
  console.error("Usage: node scripts/verify-public-deployment.mjs https://public-host");
  process.exit(2);
}

let base;
try {
  base = new URL(baseArg);
} catch {
  console.error("Public deployment URL is invalid.");
  process.exit(2);
}

if (base.protocol !== "https:" && !["127.0.0.1", "localhost"].includes(base.hostname)) {
  console.error("Public deployment verification requires HTTPS outside local smoke testing.");
  process.exit(2);
}

async function request(path, init = {}) {
  const response = await fetch(new URL(path, base), { redirect: "manual", ...init });
  return response;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  const healthResponse = await request("/api/health");
  assert(healthResponse.status === 200, `Health returned ${healthResponse.status}`);
  const health = await healthResponse.json();
  assert(health.service === "norauto-match", "Unexpected public service identity.");
  assert(health.status === "SERVING", "Public service is not reporting SERVING.");
  assert(health.inventory?.customerVisibleLiveInventory === false, "This verifier is for the representative-inventory launch and requires customer-visible live inventory to remain false.");
  assert(health.truthScope === "PUBLIC_SERVING_HEALTH_ONLY", "Health truth scope drifted.");
  assert(health.authorityEffect === "NONE", "Health endpoint must not grant authority.");

  const homeResponse = await request("/");
  assert(homeResponse.status === 200, `Home returned ${homeResponse.status}`);
  const home = await homeResponse.text();
  assert(home.includes("Representative matcher inventory"), "Representative-inventory disclosure is missing from home page.");
  assert(home.includes("Independent shopping line"), "Independent-product disclosure is missing from home page.");

  for (const path of ["/privacy", "/terms"]) {
    const response = await request(path);
    assert(response.status === 200, `${path} returned ${response.status}`);
  }

  for (const path of ["/playbook", "/master-build-prompt", "/master-build-prompt/download"]) {
    const response = await request(path);
    assert(response.status === 404, `${path} must not be public; received ${response.status}`);
  }

  const headers = homeResponse.headers;
  assert(headers.get("x-content-type-options")?.toLowerCase() === "nosniff", "Missing X-Content-Type-Options: nosniff.");
  assert(headers.get("x-frame-options")?.toUpperCase() === "DENY", "Missing X-Frame-Options: DENY.");
  assert(headers.get("referrer-policy")?.toLowerCase() === "strict-origin-when-cross-origin", "Unexpected Referrer-Policy.");
  assert(Boolean(headers.get("permissions-policy")), "Missing Permissions-Policy.");

  console.log("PASS_NORAUTO_PUBLIC_DEPLOYMENT_READ_ONLY_VERIFICATION");
  console.log(`BASE_URL=${base.origin}`);
  console.log(`INVENTORY_MODE=${health.inventory?.effectiveMode}`);
  console.log("CUSTOMER_VISIBLE_LIVE_INVENTORY=false");
  console.log("AUTHORITY_EFFECT=NONE");
}

run().catch((error) => {
  console.error(`FAIL_NORAUTO_PUBLIC_DEPLOYMENT_READ_ONLY_VERIFICATION: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
