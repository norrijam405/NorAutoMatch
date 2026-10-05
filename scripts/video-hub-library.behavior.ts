import assert from "node:assert/strict";
import { buildVideoHubEntry, parseDelimitedValues } from "../src/lib/video-hub-library";

const entry = buildVideoHubEntry({
  videoId: "b0a41a7f-f0df-40df-9d68-c88ff30d33db",
  createdAt: "2026-10-05T06:15:00.000Z",
  form: {
    title: "2026 Rogue SV walkaround",
    summary: "Customer education video.",
    canonicalUrl: "https://example.com/video/rogue",
    visibility: "PUBLIC",
    vehicleVins: ["1N4BL4DV9SN320880", "1N4BL4DV9SN320880"],
    topics: ["Rogue", "walkaround", "Rogue"],
    channels: [
      { channel: "YOUTUBE", url: "https://youtube.com/watch?v=example", publicationState: "PUBLISHED" },
    ],
  },
});

assert.equal(entry.vehicleVins.length, 1);
assert.equal(entry.topics.length, 2);
assert.equal(entry.outboundPublishingAuthority, "NOT_GRANTED");
assert.equal(entry.authorityEffect, "NONE");
assert.equal(entry.channels[0]?.publicationState, "PUBLISHED");
assert.deepEqual(parseDelimitedValues("Rogue, Rogue\nSUV", 25), ["Rogue", "SUV"]);

console.log("PASS video hub canonical metadata boundary");
