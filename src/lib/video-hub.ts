import { z } from "zod";

export const videoChannelSchema = z.enum(["NORAUTO", "YOUTUBE", "TIKTOK", "INSTAGRAM", "FACEBOOK"]);
export type VideoChannel = z.infer<typeof videoChannelSchema>;

export const videoHubEntrySchema = z.object({
  protocol: z.literal("NORAUTO_VIDEO_HUB_ENTRY_V1"),
  videoId: z.string().uuid(),
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(1000),
  canonicalUrl: z.string().url(),
  visibility: z.enum(["DRAFT", "PUBLIC", "UNLISTED"]),
  vehicleVins: z.array(z.string().regex(/^[A-HJ-NPR-Z0-9]{17}$/)).max(50),
  topics: z.array(z.string().trim().min(1).max(80)).max(25),
  createdAt: z.string().datetime({ offset: true }),
  channels: z.array(z.object({
    channel: videoChannelSchema,
    url: z.string().url(),
    publicationState: z.enum(["NOT_PUBLISHED", "UNVERIFIED", "PUBLISHED", "REMOVED"]),
    publicationEvidenceRef: z.string().trim().min(1).max(512).nullable().default(null),
    observedAt: z.string().datetime({ offset: true }),
  }).superRefine((value, ctx) => {
    if (value.publicationState === "PUBLISHED" && !value.publicationEvidenceRef) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["publicationEvidenceRef"],
        message: "Published social links require publication evidence.",
      });
    }
  })).max(20),
  outboundPublishingAuthority: z.literal("NOT_GRANTED"),
  authorityEffect: z.literal("NONE"),
});

export type VideoHubEntry = z.infer<typeof videoHubEntrySchema>;

export function publicVideoLinks(entry: VideoHubEntry) {
  const parsed = videoHubEntrySchema.parse(entry);
  if (parsed.visibility !== "PUBLIC") return [];
  return parsed.channels
    .filter((item) => item.publicationState === "PUBLISHED")
    .map(({ channel, url }) => ({ channel, url }));
}
