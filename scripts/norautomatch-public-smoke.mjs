import { readFile } from "node:fs/promises";

const local = JSON.parse(await readFile(new URL("../package-lock.json", import.meta.url), "utf8"));
const response = await fetch("https://norautomatch-auth-r1-validator.onrender.com/package-lock.json");
if (!response.ok) throw new Error(`LOCK_FETCH_FAILED:${response.status}`);
const generated = JSON.parse(await response.text());

const keys = new Set([...Object.keys(local.packages || {}), ...Object.keys(generated.packages || {})]);
const changed = {};
for (const key of [...keys].sort()) {
  const a = local.packages?.[key];
  const b = generated.packages?.[key];
  if (JSON.stringify(a) !== JSON.stringify(b)) changed[key] = b ?? null;
}
console.log("LOCK_DIFF_META "+JSON.stringify({
  localLockfileVersion: local.lockfileVersion,
  generatedLockfileVersion: generated.lockfileVersion,
  changedPackageCount: Object.keys(changed).length,
  rootChanged: JSON.stringify(local.packages?.[""]) !== JSON.stringify(generated.packages?.[""]),
  topKeys: Object.keys(generated)
}));
console.log("LOCK_DIFF_JSON "+JSON.stringify(changed));
