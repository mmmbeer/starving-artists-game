import type { MetadataRoute } from "next";
import { ART_HISTORY } from "./lib/art-history-data";

const baseUrl = "https://www.starvingartistsgame.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date("2026-08-14T00:00:00Z");
  return [
    { url: baseUrl, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/how-to-play`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/art-history`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${baseUrl}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/copyright`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    ...ART_HISTORY.map((entry) => ({
      url: `${baseUrl}/art-history/${entry.slug}`,
      lastModified,
      changeFrequency: "yearly" as const,
      priority: 0.72,
    })),
  ];
}
