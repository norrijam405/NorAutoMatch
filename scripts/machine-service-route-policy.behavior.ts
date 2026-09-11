import { readFileSync } from "node:fs";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const conversationRoute = readFileSync("src/app/api/internal/conversation-events/route.ts", "utf8");
const relayRoute = readFileSync("src/app/api/internal/crm-relay/route.ts", "utf8");

for (const [name, source] of [
  ["conversation", conversationRoute],
  ["relay", relayRoute],
] as const) {
  assert(source.includes("authorizeMachineServiceAssertion"), `${name} route must require scoped machine assertion verification.`);
  assert(source.includes("consumeMachineAssertionNonce"), `${name} route must durably consume assertion nonce before side effects.`);
  assert(!source.includes("NORAUTO_RELAY_TRIGGER_TOKEN"), `${name} route must not accept legacy relay static bearer configuration.`);
  assert(!source.includes("NORAUTO_CONVERSATION_GATEWAY_TOKEN"), `${name} route must not accept legacy conversation static bearer configuration.`);
  assert(!source.includes("authorizeRelayTrigger"), `${name} route must not call legacy relay bearer verifier.`);
  assert(!source.includes("authorizeConversationGateway"), `${name} route must not call legacy conversation bearer verifier.`);
}

assert(
  conversationRoute.includes('expectedAudience: "CONVERSATION_GATEWAY"'),
  "Conversation route must bind machine assertion to conversation gateway audience.",
);
assert(
  conversationRoute.includes("expectedWorkspaceId: parsed.data.workspaceId"),
  "Conversation route must bind machine assertion workspace to validated event workspace.",
);
assert(
  relayRoute.includes('expectedAudience: "CRM_RELAY"'),
  "Relay route must bind machine assertion to CRM relay audience.",
);
assert(
  relayRoute.includes("expectedWorkspaceId: NORAUTO_WORKSPACE_ID"),
  "Relay route must bind machine assertion to canonical NorAutoMatch workspace.",
);

console.log("PASS_MACHINE_SERVICE_ROUTE_POLICY");
