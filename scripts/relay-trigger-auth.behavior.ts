import { authorizeRelayTrigger } from "../src/lib/relay-trigger-auth";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const configured = "relay-trigger-token-that-is-at-least-thirty-two-characters";

const missingConfig = authorizeRelayTrigger({ authorizationHeader: `Bearer ${configured}`, configuredToken: undefined });
assert(!missingConfig.authorized && missingConfig.reason === "NOT_CONFIGURED", "Relay trigger must fail closed without configured secret.");

const shortConfig = authorizeRelayTrigger({ authorizationHeader: "Bearer short", configuredToken: "short" });
assert(!shortConfig.authorized && shortConfig.reason === "NOT_CONFIGURED", "Relay trigger must reject weak short configured secrets.");

const missingBearer = authorizeRelayTrigger({ authorizationHeader: null, configuredToken: configured });
assert(!missingBearer.authorized && missingBearer.reason === "MISSING_BEARER", "Relay trigger must reject missing Authorization header.");

const wrongScheme = authorizeRelayTrigger({ authorizationHeader: `Basic ${configured}`, configuredToken: configured });
assert(!wrongScheme.authorized && wrongScheme.reason === "MISSING_BEARER", "Relay trigger must reject non-Bearer credentials.");

const wrong = authorizeRelayTrigger({ authorizationHeader: "Bearer definitely-the-wrong-token-but-long-enough-to-test", configuredToken: configured });
assert(!wrong.authorized && wrong.reason === "INVALID_BEARER", "Relay trigger must reject incorrect Bearer secret.");

const correct = authorizeRelayTrigger({ authorizationHeader: `Bearer ${configured}`, configuredToken: configured });
assert(correct.authorized, "Relay trigger must accept exact configured Bearer secret.");

console.log("PASS_RELAY_TRIGGER_AUTH_FAIL_CLOSED");
