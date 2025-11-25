import { notFound } from "next/navigation";
import { MDXComponents } from "@/lib/utils/mdx-utils/mdx-components";
import { TableOfContents } from "@/lib/utils/mdx-utils/table-of-contents";
import { helpCenterCategories } from "@/lib/utils/mdx-utils/help-center-data";
import { cn } from "@/lib/utils";

interface DocsPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

async function getArticleComponent(slug: string[]) {
  try {
    const category = slug[0];
    const page = slug[1];
    const modulePath = `@/app/docs/articles/${category}/${page}.mdx`;
    const module = await import(modulePath);
    // const module = await import(`../articles/${category}/${page}.mdx`);
    return module.default;
  } catch (error) {
    return null;
  }
}

export async function generateStaticParams() {
  const params = [];
  for (const category of helpCenterCategories) {
    for (const page of category.pages) {
      params.push({
        slug: [category.id, page.id],
      });
    }
  }
  return params;
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { slug } = await params;

  if (!slug || slug.length < 2) {
    notFound();
  }

  const ArticleComponent = await getArticleComponent(slug);

  if (!ArticleComponent) {
    notFound();
  }

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
