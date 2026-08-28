import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXComponents } from "@/lib/utils/mdx-utils/mdx-components";
import { TableOfContents } from "@/lib/utils/mdx-utils/table-of-contents";
import {
  allArticleSlugs,
  getArticleLoader,
} from "@/lib/utils/mdx-utils/article-registry";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

/**
 * Only the slugs enumerated by `generateStaticParams` are routable; anything
 * else 404s before this module runs. Documentation changes when we deploy, so
 * there is nothing to render per-request.
 */
export const dynamicParams = false;

interface DocsPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateStaticParams() {
  return allArticleSlugs().map((slug) => ({ slug: slug.split("/") }));
}

type ArticleMetadata = {
  title?: unknown;
  description?: unknown;
};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0 ? value : undefined;

export async function generateMetadata({
  params,
}: DocsPageProps): Promise<Metadata> {
  const { slug } = await params;

  if (!slug || slug.length !== 2) return {};

  const path = slug.join("/");
  const loadArticle = getArticleLoader(path);

  // No article: say nothing and inherit the defaults. The page itself renders
  // the 404 — metadata generation is not the place to decide that.
  if (!loadArticle) return {};

  const { metadata } = await loadArticle();
  const article = (metadata ?? {}) as ArticleMetadata;

  const title = asString(article.title);
  const description = asString(article.description);

  if (!title) return {};

  const url = `/docs/${path}`;

  return {
    title: { absolute: `${title} | ${siteConfig.name} Help` },
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      url,
      title,
      description,
      images: [{ url: siteConfig.ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [siteConfig.ogImage],
    },
  };
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { slug } = await params;

  if (!slug || slug.length !== 2) {
    notFound();
  }

  const loadArticle = getArticleLoader(slug.join("/"));

  // A slug with no registered article is the only legitimate 404 here. Failures
  // *inside* the article — an MDX syntax error, a bad import — are deliberately
  // left to throw into the error boundary. Swallowing them into a 404 used to
  // make a broken article indistinguishable from a missing one.
  if (!loadArticle) {
    notFound();
  }

  const { default: ArticleComponent } = await loadArticle();

  return (
    <div className="flex flex-1">
      {/* The "prose-content" class name is used to identify the main content area which is then used to generate the Table of Content. */}
      <article className="flex-1 prose-content px-6 -mt-0">
        <ArticleComponent components={MDXComponents} />
      </article>

      <aside className="hidden lg:block w-72 sticky top-0">
        <TableOfContents
          className={cn("overflow-y-auto sticky top-[calc(100vh-90vh)]")}
        />
      </aside>
    </div>
  );
}
