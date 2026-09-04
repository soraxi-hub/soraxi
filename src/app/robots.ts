import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = (siteConfig.url ?? "").replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Gated, per-user, or transactional routes. Nothing here is useful in
        // a search result, and several would waste crawl budget on redirects
        // to the sign-in page.
        disallow: [
          "/api/",
          "/admin/",
          "/admin-sign-in",
          "/store/",
          "/checkout/",
          "/cart",
          "/profile",
          "/edit-profile",
          "/orders",
          "/wishlist",
          "/my-requests",
          "/messages",
          "/security/",
          "/verification",
          "/d/",
          "/requests/new",
          "/requests/*/edit",
          "/sign-in",
          "/sign-up",
          "/login",
          "/forgot-password",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
