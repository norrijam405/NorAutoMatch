import type { MetadataRoute } from "next";
import { brand, cityDetails } from "@/lib/brand";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const core = ["", "/how-it-works", "/privacy"].map((path, index) => ({
    url: `${brand.baseUrl}${path}`,
    lastModified: now,
    changeFrequency: index === 0 ? "weekly" as const : "monthly" as const,
    priority: index === 0 ? 1 : .7,
  }));
  const areas = Object.keys(cityDetails).map((slug) => ({
    url: `${brand.baseUrl}/areas/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: .75,
  }));
  return [...core, ...areas];
}
