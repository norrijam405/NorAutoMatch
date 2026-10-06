"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireNorAutoMembership } from "@/lib/supabase/authz";
import { buildVideoHubEntry, parseDelimitedValues } from "@/lib/video-hub-library";

const channelNames = ["YOUTUBE", "TIKTOK", "INSTAGRAM", "FACEBOOK"] as const;

export async function createVideoHubEntry(formData: FormData) {
  const { supabase, userId } = await requireNorAutoMembership(
    ["operator", "admin", "founder"],
    "/manager/videos",
  );

  const createdAt = new Date().toISOString();
  const channels = channelNames.flatMap((channel) => {
    const raw = String(formData.get(channel.toLowerCase()) ?? "").trim();
    return raw
      ? [{ channel, url: raw, publicationState: "UNVERIFIED" as const }]
      : [];
  });

  const entry = buildVideoHubEntry({
    videoId: randomUUID(),
    createdAt,
    form: {
      title: String(formData.get("title") ?? ""),
      summary: String(formData.get("summary") ?? ""),
      canonicalUrl: String(formData.get("canonicalUrl") ?? ""),
      visibility: String(formData.get("visibility") ?? "DRAFT") as "DRAFT" | "PUBLIC" | "UNLISTED",
      vehicleVins: parseDelimitedValues(String(formData.get("vehicleVins") ?? ""), 50).map((value) => value.toUpperCase()),
      topics: parseDelimitedValues(String(formData.get("topics") ?? ""), 25),
      channels,
    },
  });

  const { error } = await supabase.from("video_hub_entries").insert({
    id: entry.videoId,
    title: entry.title,
    summary: entry.summary,
    canonical_url: entry.canonicalUrl,
    visibility: entry.visibility,
    vehicle_vins: entry.vehicleVins,
    topics: entry.topics,
    channels: entry.channels,
    created_by: userId,
    created_at: entry.createdAt,
    updated_at: entry.createdAt,
  });

  if (error) throw error;

  revalidatePath("/manager/videos");
  revalidatePath("/videos");
}

export async function updateVideoHubVisibility(formData: FormData) {
  const { supabase } = await requireNorAutoMembership(
    ["operator", "admin", "founder"],
    "/manager/videos",
  );
  const id = String(formData.get("videoId") ?? "");
  const visibility = String(formData.get("visibility") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw new Error("Invalid video id.");
  if (!["DRAFT", "PUBLIC", "UNLISTED"].includes(visibility)) throw new Error("Invalid visibility.");

  const { error } = await supabase
    .from("video_hub_entries")
    .update({ visibility })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/manager/videos");
  revalidatePath("/videos");
}
