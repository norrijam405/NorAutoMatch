import type { Pool } from "pg";

export type TorqueVideoRecommendation = {
  protocol: "NORAUTO_TORQUE_VIDEO_RECOMMENDATION_V1";
  videoId: string;
  title: string;
  canonicalUrl: string;
  matchedVins: string[];
  topics: string[];
  authorityEffect: "NONE";
};

const VIN = /^[A-HJ-NPR-Z0-9]{17}$/;

export function extractVehicleVins(subjectRefs: string[]) {
  return [...new Set(subjectRefs.map((ref) => ref.trim().toUpperCase()).filter((ref) => VIN.test(ref)))];
}

export async function readTorqueVideoRecommendations(input: {
  pool: Pool;
  subjectRefs: string[];
  limit?: number;
}): Promise<TorqueVideoRecommendation[]> {
  const vins = extractVehicleVins(input.subjectRefs);
  if (!vins.length) return [];
  const limit = Math.max(1, Math.min(input.limit ?? 5, 10));

  const result = await input.pool.query<{
    id: string;
    title: string;
    canonical_url: string;
    vehicle_vins: string[];
    topics: string[];
  }>(
    `select id, title, canonical_url, vehicle_vins, topics
       from video_hub_entries
      where visibility = 'PUBLIC'
        and vehicle_vins && $1::text[]
      order by created_at desc, id asc
      limit $2`,
    [vins, limit],
  );

  return result.rows.map((row) => ({
    protocol: "NORAUTO_TORQUE_VIDEO_RECOMMENDATION_V1",
    videoId: row.id,
    title: row.title,
    canonicalUrl: row.canonical_url,
    matchedVins: row.vehicle_vins.filter((vin) => vins.includes(vin)),
    topics: row.topics,
    authorityEffect: "NONE",
  }));
}
