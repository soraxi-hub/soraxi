import type { MetadataRoute } from "next";
import { categories } from "@/constants/constant";
import { siteConfig } from "@/config/site";
import { getProducts } from "@/lib/db/models/product.model";
import { allArticleSlugs } from "@/lib/utils/mdx-utils/article-registry";
import { RequestService } from "@/services/request.service";

/** Cap on product URLs, well inside the 50,000-entry limit for one sitemap. */
const MAX_PRODUCT_URLS = 5000;

export const revalidate = 3600;

/**
 * Static pages worth indexing. Account, store-admin and checkout routes are
 * excluded deliberately — they are gated, per-user, or both.
 */
const STATIC_PATHS = [
  "/",
  "/about",
  "/support",
  "/privacy-policy",
  "/shipping-return-policy",
  "/terms-conditions",
  "/products",
  "/requests",
  "/docs",
];

/** Cap on request-listing URLs, mirroring the product cap below. */
const MAX_REQUEST_URLS = 1000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (siteConfig.url ?? "").replace(/\/$/, "");
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: path === "/" ? 1 : 0.5,
  }));

  const categoryEntries: MetadataRoute.Sitemap = categories.flatMap(
    (category) => [
      {
        url: `${baseUrl}/category/${category.slug}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.8,
      },
      ...category.subcategories.map((subcategory) => ({
        url: `${baseUrl}/category/${category.slug}/${subcategory.slug}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.7,
      })),
    ]
  );

  // A database hiccup should cost the product URLs, not the whole sitemap —
  // an error here would otherwise take the category URLs down with it.
  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const products = await getProducts({
      visibleOnly: true,
      verified: true,
      limit: MAX_PRODUCT_URLS,
    });

    productEntries = products.map((product) => ({
      url: `${baseUrl}/products/${product.slug}`,
      lastModified: product.updatedAt ?? now,
      changeFrequency: "weekly",
      priority: 0.6,
    }));
  } catch (error) {
    console.error("sitemap: failed to load products", error);
  }

  // Static data, no DB round-trip: every registered help-center article.
  const docsEntries: MetadataRoute.Sitemap = allArticleSlugs().map((slug) => ({
    url: `${baseUrl}/docs/${slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.4,
  }));

  // Each open request is unique, user-authored content — see the metadata on
  // `/requests/[requestId]` — so it belongs here the same way a product does.
  let requestEntries: MetadataRoute.Sitemap = [];
  try {
    const requestService = await RequestService.init();
    const { requests } = await requestService.getAllRequests({
      limit: MAX_REQUEST_URLS,
    });

    requestEntries = requests.map((request) => ({
      url: `${baseUrl}/requests/${request._id}`,
      lastModified: request.updatedAt ?? now,
      changeFrequency: "weekly",
      priority: 0.4,
    }));
  } catch (error) {
    console.error("sitemap: failed to load requests", error);
  }

  return [
    ...staticEntries,
    ...categoryEntries,
    ...productEntries,
    ...docsEntries,
    ...requestEntries,
  ];
}
