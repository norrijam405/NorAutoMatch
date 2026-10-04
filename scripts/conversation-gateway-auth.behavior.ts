import { authorizeConversationGateway, type ConversationGatewayAuthResult } from "../src/lib/conversation-gateway-auth";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function expectRejected(
  result: ConversationGatewayAuthResult,
  reason: "NOT_CONFIGURED" | "MISSING_BEARER" | "INVALID_BEARER",
  message: string,
) {
  assert(result.authorized === false, message);
  assert(result.reason === reason, `${message} Expected ${reason}; received ${result.reason}.`);
}

const token = "g".repeat(48);

expectRejected(
  authorizeConversationGateway({ authorizationHeader: null, configuredToken: undefined }),
  "NOT_CONFIGURED",
  "Gateway must fail closed when no credential is configured.",
);
expectRejected(
  authorizeConversationGateway({ authorizationHeader: null, configuredToken: token }),
  "MISSING_BEARER",
  "Gateway must reject a missing bearer.",
);
expectRejected(
  authorizeConversationGateway({ authorizationHeader: "Bearer wrong-token", configuredToken: token }),
  "INVALID_BEARER",
  "Gateway must reject the wrong bearer.",
);
assert(
  authorizeConversationGateway({ authorizationHeader: `Bearer ${token}`, configuredToken: token }).authorized === true,
  "Gateway must accept the exact configured bearer.",
);
expectRejected(
  authorizeConversationGateway({ authorizationHeader: `Bearer ${token}`, configuredToken: "short" }),
  "NOT_CONFIGURED",
  "Gateway must refuse undersized configured secrets.",
);

console.log("PASS_CONVERSATION_GATEWAY_FAIL_CLOSED_AUTH");
