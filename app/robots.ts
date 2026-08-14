import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/curator/", "/game/"],
    },
    sitemap: "https://www.starvingartistsgame.com/sitemap.xml",
    host: "https://www.starvingartistsgame.com",
  };
}
