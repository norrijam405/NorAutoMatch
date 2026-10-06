import { z } from "zod";
import { videoHubEntrySchema, type VideoHubEntry } from "./video-hub";

export const videoHubManagerFormSchema = z.object({
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(1000),
  canonicalUrl: z.string().url(),
  visibility: z.enum(["DRAFT", "PUBLIC", "UNLISTED"]),
  vehicleVins: z.array(z.string().trim().toUpperCase().regex(/^[A-HJ-NPR-Z0-9]{17}$/)).max(50),
  topics: z.array(z.string().trim().min(1).max(80)).max(25),
  channels: z.array(z.object({
    channel: z.enum(["NORAUTO", "YOUTUBE", "TIKTOK", "INSTAGRAM", "FACEBOOK"]),
    url: z.string().url(),
    publicationState: z.enum(["NOT_PUBLISHED", "UNVERIFIED", "PUBLISHED", "REMOVED"]),
    publicationEvidenceRef: z.string().trim().min(1).max(512).nullable().default(null),
  }).superRefine((value, ctx) => {
    if (value.publicationState === "PUBLISHED" && !value.publicationEvidenceRef) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["publicationEvidenceRef"],
        message: "Published social links require publication evidence.",
      });
    }
  })).max(20),
});

export function buildVideoHubEntry(input: {
  videoId: string;
  createdAt: string;
  form: z.infer<typeof videoHubManagerFormSchema>;
}): VideoHubEntry {
  const form = videoHubManagerFormSchema.parse(input.form);
  return videoHubEntrySchema.parse({
    protocol: "NORAUTO_VIDEO_HUB_ENTRY_V1",
    videoId: input.videoId,
    title: form.title,
    summary: form.summary,
    canonicalUrl: form.canonicalUrl,
    visibility: form.visibility,
    vehicleVins: [...new Set(form.vehicleVins)],
    topics: [...new Set(form.topics)],
    createdAt: input.createdAt,
    channels: form.channels.map((channel) => ({
      ...channel,
      observedAt: input.createdAt,
    })),
    outboundPublishingAuthority: "NOT_GRANTED",
    authorityEffect: "NONE",
  });
}

export function parseDelimitedValues(raw: string, max: number) {
  return [...new Set(raw.split(/[\n,]/).map((value) => value.trim()).filter(Boolean))].slice(0, max);
}
