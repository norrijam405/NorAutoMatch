import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const serverSecretNames = [
  "NORAUTO_PUBLIC_ABUSE_HMAC_SECRET",
  "NORAUTO_PUBLIC_ABUSE_HMAC_PREVIOUS_SECRET",
  "NORAUTO_RELAY_ASSERTION_SECRET",
  "NORAUTO_RELAY_ASSERTION_PREVIOUS_SECRET",
  "NORAUTO_CONVERSATION_GATEWAY_ASSERTION_SECRET",
  "NORAUTO_CONVERSATION_GATEWAY_ASSERTION_PREVIOUS_SECRET",
  "NORAUTO_MANAGER_SESSION_SECRET",
  "NORAUTO_MANAGER_SESSION_PREVIOUS_SECRET",
] as const;

const approvedClientPublicCredentials = new Set([
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
]);

async function sourceFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const path = join(root, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (entry.isFile() && /\.(ts|tsx|js|mjs)$/.test(entry.name)) return [path];
    return [];
  }));
  return nested.flat();
}

function clientExposedSecretLikeNames(text: string): string[] {
  return [...text.matchAll(/NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|TOKEN|KEY)[A-Z0-9_]*/g)]
    .map((match) => match[0])
    .filter((name) => !approvedClientPublicCredentials.has(name));
}

async function main() {
  const files = await sourceFiles("src");
  for (const path of files) {
    const text = await readFile(path, "utf8");
    const isClientModule = /^\s*["']use client["'];?/m.test(text);
    if (isClientModule) {
      for (const name of serverSecretNames) {
        assert(!text.includes(name), `${name} must not be referenced by client module ${path}`);
      }
    }
    const exposedSecretLikeNames = clientExposedSecretLikeNames(text);
    assert.equal(
      exposedSecretLikeNames.length,
      0,
      `Client-exposed secret-like environment name(s) ${exposedSecretLikeNames.join(", ")} detected in ${path}`,
    );
  }

  const supabaseClient = await readFile("src/lib/supabase/client.ts", "utf8");
  assert(
    supabaseClient.includes("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    "Supabase browser client must use the explicitly publishable credential name.",
  );
  assert(
    !supabaseClient.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    "Supabase browser client must not regress to the ambiguous legacy anon-key environment name.",
  );
  assert(
    !supabaseClient.includes("SERVICE_ROLE") && !supabaseClient.includes("SECRET_KEY"),
    "Supabase browser client must never reference a service-role or secret key.",
  );

  const relayRoute = await readFile("src/app/api/internal/crm-relay/route.ts", "utf8");
  assert(relayRoute.includes("NORAUTO_RELAY_ASSERTION_SECRET"), "Relay route must use the current assertion secret.");
  assert(relayRoute.includes("NORAUTO_RELAY_ASSERTION_PREVIOUS_SECRET"), "Relay route must wire the previous assertion secret for bounded rollover.");
  assert(!relayRoute.includes("NORAUTO_RELAY_TRIGGER_TOKEN"), "Relay route must not regress to the retired static bearer token.");

  const conversationRoute = await readFile("src/app/api/internal/conversation-events/route.ts", "utf8");
  assert(conversationRoute.includes("NORAUTO_CONVERSATION_GATEWAY_ASSERTION_SECRET"), "Conversation route must use the current assertion secret.");
  assert(conversationRoute.includes("NORAUTO_CONVERSATION_GATEWAY_ASSERTION_PREVIOUS_SECRET"), "Conversation route must wire the previous assertion secret for bounded rollover.");
  assert(!conversationRoute.includes("NORAUTO_CONVERSATION_GATEWAY_TOKEN"), "Conversation route must not regress to the retired static bearer token.");

  const leadRoute = await readFile("src/app/api/leads/route.ts", "utf8");
  assert(leadRoute.includes("NORAUTO_PUBLIC_ABUSE_HMAC_SECRET"), "Public lead route must use the current abuse-control HMAC key.");
  assert(leadRoute.includes("NORAUTO_PUBLIC_ABUSE_HMAC_PREVIOUS_SECRET"), "Public lead route must preserve abuse budgets during HMAC rollover.");

  const managerGuard = await readFile("src/lib/manager-route-auth.ts", "utf8");
  assert(managerGuard.includes("NORAUTO_MANAGER_SESSION_SECRET"), "Shared manager guard must use the current manager session key.");

  const preflight = await readFile("src/lib/production-readiness.ts", "utf8");
  for (const name of serverSecretNames) {
    assert(preflight.includes(name), `Production preflight must validate live secret ${name}.`);
  }
  assert(!preflight.includes("NORAUTO_RELAY_TRIGGER_TOKEN"), "Production preflight must not validate retired static relay credentials.");

  const envExample = await readFile(".env.example", "utf8");
  for (const name of serverSecretNames) {
    assert(envExample.includes(`${name}=`), `.env.example must document ${name}.`);
  }
  assert(
    envExample.includes("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="),
    ".env.example must explicitly document the approved browser-safe Supabase publishable key.",
  );
  assert(
    envExample.includes("Never put a Supabase secret/service-role key in a NEXT_PUBLIC_ variable."),
    ".env.example must preserve the browser credential safety warning.",
  );

  console.log("PASS_SECRETS_KEY_SURFACE_CONTRACT");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
