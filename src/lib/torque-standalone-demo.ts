/**
 * Isolated, intentionally read-only Torque demo for an uncredentialed preview.
 * Never activate on ordinary sites: require three explicit development gates.
 * Does not enable inventory provider access, authentication, or CRM mutations.
 */
export function isTorqueStandaloneDemo(): boolean {
  return process.env.NORAUTO_TORQUE_STANDALONE_DEMO === "1" &&
    process.env.NORAUTO_INVENTORY_MODE === "demo" &&
    process.env.NORAUTO_SKIP_CRM_MIGRATIONS === "1";
}

/**
 * Preview-only, read-only access to Orr Nissan West's PUBLIC catalog.
 * No CRM, Supabase, customer writes, provider secrets, or production switching.
 * Source failures must fail closed instead of substituting sample vehicles.
 */
export function canUseTorquePreviewVerifiedCatalog(): boolean {
  return isTorqueStandaloneDemo() &&
    process.env.NORAUTO_TORQUE_PREVIEW_VERIFIED_READ_ONLY === "1";
}
