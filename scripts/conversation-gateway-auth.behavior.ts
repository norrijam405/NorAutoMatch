import { authorizeConversationGateway } from "../src/lib/conversation-gateway-auth";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const token = "g".repeat(48);

assert(
  authorizeConversationGateway({ authorizationHeader: null, configuredToken: undefined }).reason === "NOT_CONFIGURED",
  "Gateway must fail closed when no credential is configured.",
);
assert(
  authorizeConversationGateway({ authorizationHeader: null, configuredToken: token }).reason === "MISSING_BEARER",
  "Gateway must reject a missing bearer.",
);
assert(
  authorizeConversationGateway({ authorizationHeader: "Bearer wrong-token", configuredToken: token }).reason === "INVALID_BEARER",
  "Gateway must reject the wrong bearer.",
);
assert(
  authorizeConversationGateway({ authorizationHeader: `Bearer ${token}`, configuredToken: token }).authorized === true,
  "Gateway must accept the exact configured bearer.",
);
assert(
  authorizeConversationGateway({ authorizationHeader: `Bearer ${token}`, configuredToken: "short" }).reason === "NOT_CONFIGURED",
  "Gateway must refuse undersized configured secrets.",
);

console.log("PASS_CONVERSATION_GATEWAY_FAIL_CLOSED_AUTH");
