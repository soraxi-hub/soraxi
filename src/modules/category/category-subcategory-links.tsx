import Link from "next/link";
import { cn } from "@/lib/utils";

interface CategorySubcategoryLinksProps {
  categorySlug: string;
  subcategories: { name: string; slug: string }[];
  /** Highlighted and rendered as plain text rather than a self-link. */
  activeSlug?: string;
}

/**
 * In-body links from a category to each of its subcategories.
 *
 * The header nav already lists these, but only inside a hover tooltip that is
 * portal-mounted on mouseover — so they never appear in the served HTML and a
 * crawler has no path to them. These are plain anchors, always rendered.
 */
export function CategorySubcategoryLinks({
  categorySlug,
  subcategories,
  activeSlug,
}: CategorySubcategoryLinksProps) {
  if (subcategories.length === 0) return null;

  return (
    <nav aria-label="Subcategories">
      <ul className="flex flex-wrap gap-2">
        {subcategories.map((subcategory) => {
          const isActive = subcategory.slug === activeSlug;

          return (
            <li key={subcategory.slug}>
              {isActive ? (
                <span
                  aria-current="page"
                  className="inline-flex items-center rounded-full border border-soraxi-green bg-soraxi-green/10 px-3 py-1 text-sm font-medium text-soraxi-green"
                >
                  {subcategory.name}
                </span>
              ) : (
                <Link
                  href={`/category/${categorySlug}/${subcategory.slug}`}
                  className={cn(
                    "inline-flex items-center rounded-full border px-3 py-1 text-sm",
                    "text-muted-foreground transition-colors",
                    "hover:border-soraxi-green hover:text-soraxi-green"
                  )}
                >
                  {subcategory.name}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
