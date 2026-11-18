import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getSiteUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/p/", "/preview", "/privacidad", "/terminos"],
        disallow: ["/app/", "/api/", "/auth/", "/crear-espacio", "/invitacion/", "/restablecer"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
