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
