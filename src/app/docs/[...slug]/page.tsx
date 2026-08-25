import { notFound } from "next/navigation";
import { MDXComponents } from "@/lib/utils/mdx-utils/mdx-components";
import { TableOfContents } from "@/lib/utils/mdx-utils/table-of-contents";
import {
  allArticleSlugs,
  getArticleLoader,
} from "@/lib/utils/mdx-utils/article-registry";
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
