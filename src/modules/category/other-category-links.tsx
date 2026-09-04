import Link from "next/link";
import { categories } from "@/constants/constant";

interface OtherCategoryLinksProps {
  /** Omitted from the list — a page should not link to itself. */
  currentSlug: string;
}

/**
 * Sibling-category links, below the grid.
 *
 * Placed after the products because visitors came to shop, not to navigate;
 * the links still sit in the HTML for crawlers either way. With five
 * categories there is no dilution argument for trimming the list.
 */
export function OtherCategoryLinks({ currentSlug }: OtherCategoryLinksProps) {
  const others = categories.filter((category) => category.slug !== currentSlug);

  if (others.length === 0) return null;

  return (
    <nav aria-label="Other categories" className="border-t pt-6">
      <h2 className="text-sm font-semibold text-muted-foreground mb-3">
        Browse other categories
      </h2>
      <ul className="flex flex-wrap gap-2">
        {others.map((category) => (
          <li key={category.slug}>
            <Link
              href={`/category/${category.slug}`}
              className="inline-flex items-center rounded-full border px-3 py-1 text-sm text-muted-foreground transition-colors hover:border-soraxi-green hover:text-soraxi-green"
            >
              {category.name}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
