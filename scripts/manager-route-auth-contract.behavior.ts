import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const managerRoutes = [
  "src/app/api/manager/conversations/prepare/route.ts",
  "src/app/api/manager/conversations/queue/route.ts",
  "src/app/api/manager/follow-up/attempt/route.ts",
  "src/app/api/manager/follow-up/confirm/route.ts",
  "src/app/api/manager/follow-up/queue/route.ts",
  "src/app/api/manager/progression/appointment/route.ts",
  "src/app/api/manager/progression/outcome/route.ts",
  "src/app/api/manager/progression/queue/route.ts",
  "src/app/api/manager/queue/route.ts",
  "src/app/api/manager/review/route.ts",
] as const;

async function main() {
  for (const route of managerRoutes) {
    const source = await readFile(route, "utf8");
    assert(source.includes('from "@/lib/manager-route-auth"'), `${route} must import the shared durable manager route guard`);
    assert(source.includes("authorizeManagerRequest(request)"), `${route} must invoke the shared durable manager route guard`);
    assert(!source.includes("authorizeManagerSession("), `${route} must not bypass durable revocation with direct session-only authorization`);
  }
  console.log(`PASS_MANAGER_ROUTE_AUTH_CONTRACT:${managerRoutes.length}`);
}

main();
