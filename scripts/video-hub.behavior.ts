import assert from "node:assert/strict";
import { publicVideoLinks, videoHubEntrySchema } from "../src/lib/video-hub";

const entry = videoHubEntrySchema.parse({
  protocol: "NORAUTO_VIDEO_HUB_ENTRY_V1",
  videoId: "84a7b58a-70cb-498d-85c7-8aab93dceae5",
  title: "Rogue SV walkaround",
  summary: "Founder-created customer education video.",
  canonicalUrl: "https://example.com/videos/rogue-sv",
  visibility: "PUBLIC",
  vehicleVins: ["1N4BL4DV9SN320880"],
  topics: ["Rogue", "walkaround"],
  createdAt: "2026-10-04T12:00:00.000Z",
  channels: [
    { channel: "YOUTUBE", url: "https://youtube.com/watch?v=example", publicationState: "PUBLISHED", observedAt: "2026-10-04T12:30:00.000Z" },
    { channel: "TIKTOK", url: "https://tiktok.com/@example/video/example", publicationState: "NOT_PUBLISHED", observedAt: "2026-10-04T12:30:00.000Z" },
  ],
  outboundPublishingAuthority: "NOT_GRANTED",
  authorityEffect: "NONE",
});

const links = publicVideoLinks(entry);
assert.equal(links.length, 1);
assert.equal(links[0]?.channel, "YOUTUBE");
assert.equal(entry.outboundPublishingAuthority, "NOT_GRANTED");

console.log("PASS video hub publication truth boundary");
