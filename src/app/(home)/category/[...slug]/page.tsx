import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { SearchParams } from "nuqs/server";

import { categories } from "@/constants/constant";
import { siteConfig } from "@/config/site";
import { getQueryClient, HydrateClient, trpc } from "@/trpc/server";
import { CategoryHeader } from "@/modules/category/CategoryHeader";
import { CategorySubcategoryLinks } from "@/modules/category/category-subcategory-links";
import { CategoryView } from "@/modules/category/category-view";
import { OtherCategoryLinks } from "@/modules/category/other-category-links";
import {
  buildCategoryProductsInput,
  loadCategorySearchParams,
} from "@/modules/category/category-search-params";

interface CategoryPageProps {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<SearchParams>;
}

function resolveCategory(slugs: string[]) {
  if (slugs.length === 0 || slugs.length > 2) return null;

  const [categorySlug, subcategorySlug] = slugs;
  const category = categories.find((cat) => cat.slug === categorySlug);
  if (!category) return null;

  if (!subcategorySlug) {
    return { category, subcategory: undefined };
  }

  const subcategory = category.subcategories.find(
    (sub) => sub.slug === subcategorySlug,
  );
  if (!subcategory) return null;

  return { category, subcategory };
}

export async function generateMetadata({
  params,
  searchParams,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolveCategory(slug);

  if (!resolved) return {};

  const { category, subcategory } = resolved;
  const { page } = await loadCategorySearchParams(searchParams);

  const name = subcategory?.name ?? category.name;
  const path = subcategory
    ? `/category/${category.slug}/${subcategory.slug}`
    : `/category/${category.slug}`;

  // Filters and sort are deliberately dropped from the canonical: they produce
  // the same catalogue in a different arrangement, and each combination would
  // otherwise be a separate indexable URL. Page number is kept, because page 2
  // genuinely holds different products.
  const canonical = page > 1 ? `${path}?page=${page}` : path;

  const description = subcategory
    ? `Shop ${subcategory.name} from verified campus vendors in the ${category.name} category on ${siteConfig.name}.`
    : `Shop ${category.name} on ${siteConfig.name} — ${category.subcategories
        .map((sub) => sub.name)
        .join(", ")} — from verified campus vendors.`;

  const title = page > 1 ? `${name} — Page ${page}` : name;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: `${siteConfig.url ?? ""}${canonical}`,
      title,
      description,
      images: [
        {
          url: siteConfig.ogImage,
          width: 1200,
          height: 630,
          alt: name,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteConfig.ogImage],
    },
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: CategoryPageProps) {
  const { slug } = await params;
  const resolved = resolveCategory(slug);

  if (!resolved) {
    notFound();
  }

  const { category, subcategory } = resolved;
  const parsedParams = await loadCategorySearchParams(searchParams);

  const basePath = subcategory
    ? `/category/${category.slug}/${subcategory.slug}`
    : `/category/${category.slug}`;

  // Awaited rather than handed to the fire-and-forget `prefetch` helper: that
  // one streams the rows in after the shell, so the markup a crawler reads
  // first would still be an empty grid. Awaiting puts the products in the
  // initial HTML, which is the point of rendering this on the server at all.
  await getQueryClient().prefetchQuery(
    trpc.home.getPublicProducts.queryOptions(
      buildCategoryProductsInput({
        categorySlug: category.slug,
        subcategorySlug: subcategory?.slug,
        params: parsedParams,
      }),
    ),
  );

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="space-y-8">
        <CategoryHeader
          categoryName={category.name}
          categorySlug={category.slug}
          subcategoryName={subcategory?.name}
        />

        <CategorySubcategoryLinks
          categorySlug={category.slug}
          subcategories={category.subcategories}
          activeSlug={subcategory?.slug}
        />

        <HydrateClient>
          <CategoryView
            categorySlug={category.slug}
            subcategorySlug={subcategory?.slug}
            basePath={basePath}
          />
        </HydrateClient>

        <OtherCategoryLinks currentSlug={category.slug} />
      </div>
    </div>
  );
}
