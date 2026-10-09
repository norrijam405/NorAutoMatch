import assert from "node:assert/strict";
import { buildVideoHubEntry, parseDelimitedValues } from "../src/lib/video-hub-library";
import { publicVideoLinks } from "../src/lib/video-hub";

const manualEntry = buildVideoHubEntry({
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
      {
        channel: "YOUTUBE",
        url: "https://youtube.com/watch?v=example",
        publicationState: "UNVERIFIED",
        publicationEvidenceRef: null,
      },
    ],
  },
});

assert.equal(manualEntry.vehicleVins.length, 1);
assert.equal(manualEntry.topics.length, 2);
assert.equal(manualEntry.outboundPublishingAuthority, "NOT_GRANTED");
assert.equal(manualEntry.authorityEffect, "NONE");
assert.equal(manualEntry.channels[0]?.publicationState, "UNVERIFIED");
assert.deepEqual(publicVideoLinks(manualEntry), [], "unverified manager-entered URLs must not become public publication evidence");

assert.throws(
  () => buildVideoHubEntry({
    videoId: "5f93dbd7-acde-4f0f-910a-3d38ca9efb1a",
    createdAt: "2026-10-05T06:16:00.000Z",
    form: {
      title: "Unproven social publication",
      summary: "",
      canonicalUrl: "https://example.com/video/unproven",
      visibility: "PUBLIC",
      vehicleVins: [],
      topics: [],
      channels: [
        {
          channel: "YOUTUBE",
          url: "https://youtube.com/watch?v=unproven",
          publicationState: "PUBLISHED",
          publicationEvidenceRef: null,
        },
      ],
    },
  }),
  /independently verified provider evidence/,
);

assert.throws(
  () => buildVideoHubEntry({
    videoId: "edaa94a7-42ce-4201-b447-ab8427eed6b7",
    createdAt: "2026-10-05T06:17:00.000Z",
    form: {
      title: "Self-asserted publication reference",
      summary: "",
      canonicalUrl: "https://example.com/video/evidenced",
      visibility: "PUBLIC",
      vehicleVins: [],
      topics: [],
      channels: [
        {
          channel: "YOUTUBE",
          url: "https://youtube.com/watch?v=evidenced",
          publicationState: "PUBLISHED",
          publicationEvidenceRef: "provider-receipt:synthetic-proof-001",
        },
      ],
    },
  }),
  /independently verified provider evidence/,
  "manual evidence text must not mint PUBLISHED truth",
);

assert.deepEqual(parseDelimitedValues("Rogue, Rogue\nSUV", 25), ["Rogue", "SUV"]);

console.log("PASS video hub publication truth boundary");
