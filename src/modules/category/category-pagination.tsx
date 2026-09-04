"use client";

import Link from "next/link";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
} from "@/components/ui/pagination";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  serializeCategorySearchParams,
  type CategorySearchParams,
} from "@/modules/category/category-search-params";

interface CategoryPaginationProps {
  basePath: string;
  currentPage: number;
  totalPages: number;
  params: CategorySearchParams;
}

/**
 * Builds the condensed page list: always the first and last page, the pages
 * either side of the current one, and an ellipsis wherever that skips a run.
 */
function pageWindow(currentPage: number, totalPages: number): (number | "gap")[] {
  const pages = new Set<number>([1, totalPages]);

  for (let page = currentPage - 1; page <= currentPage + 1; page++) {
    if (page >= 1 && page <= totalPages) pages.add(page);
  }

  const ordered = [...pages].sort((a, b) => a - b);
  const withGaps: (number | "gap")[] = [];

  ordered.forEach((page, index) => {
    if (index > 0 && page - (ordered[index - 1] as number) > 1) {
      withGaps.push("gap");
    }
    withGaps.push(page);
  });

  return withGaps;
}

export function CategoryPagination({
  basePath,
  currentPage,
  totalPages,
  params,
}: CategoryPaginationProps) {
  // Real hrefs rather than click handlers: this is how a crawler reaches
  // page two, and how a shopper can bookmark or open a page in a new tab.
  const hrefFor = (page: number) =>
    serializeCategorySearchParams(basePath, { ...params, page });

  const pages = pageWindow(currentPage, totalPages);

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          {currentPage > 1 ? (
            <Link
              href={hrefFor(currentPage - 1)}
              rel="prev"
              aria-label="Go to previous page"
              className={cn(buttonVariants({ variant: "ghost" }), "gap-1 px-2.5")}
              scroll
            >
              Previous
            </Link>
          ) : (
            <span
              aria-hidden
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "gap-1 px-2.5 pointer-events-none opacity-50"
              )}
            >
              Previous
            </span>
          )}
        </PaginationItem>

        {pages.map((page, index) =>
          page === "gap" ? (
            <PaginationItem key={`gap-${index}`}>
              <PaginationEllipsis />
            </PaginationItem>
          ) : (
            <PaginationItem key={page}>
              <Link
                href={hrefFor(page)}
                aria-label={`Go to page ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
                className={cn(
                  buttonVariants({
                    variant: page === currentPage ? "outline" : "ghost",
                    size: "icon",
                  })
                )}
                scroll
              >
                {page}
              </Link>
            </PaginationItem>
          )
        )}

        <PaginationItem>
          {currentPage < totalPages ? (
            <Link
              href={hrefFor(currentPage + 1)}
              rel="next"
              aria-label="Go to next page"
              className={cn(buttonVariants({ variant: "ghost" }), "gap-1 px-2.5")}
              scroll
            >
              Next
            </Link>
          ) : (
            <span
              aria-hidden
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "gap-1 px-2.5 pointer-events-none opacity-50"
              )}
            >
              Next
            </span>
          )}
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
