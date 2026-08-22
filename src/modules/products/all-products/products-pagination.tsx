"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProductsPaginationProps {
  page: number;
  totalPages: number;
  onPageChangeAction: (page: number) => void;
  className?: string;
}

/**
 * Page numbers, windowed around the current page.
 *
 * A listing that grows past a handful of pages would otherwise render every
 * number, which overflows the row on a phone long before the catalogue is
 * large. Five slots keep the control a fixed width at any catalogue size.
 */
function pageWindow(page: number, totalPages: number): number[] {
  const MAX_SLOTS = 5;
  if (totalPages <= MAX_SLOTS) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const half = Math.floor(MAX_SLOTS / 2);
  const start = Math.min(Math.max(1, page - half), totalPages - MAX_SLOTS + 1);

  return Array.from({ length: MAX_SLOTS }, (_, i) => start + i);
}

export function ProductsPagination({
  page,
  totalPages,
  onPageChangeAction,
  className,
}: ProductsPaginationProps) {
  // One page is not a pager. Rendering disabled Previous/Next around a lone "1"
  // implies there is somewhere else to go.
  if (totalPages <= 1) return null;

  const pages = pageWindow(page, totalPages);

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-1", className)}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChangeAction(page - 1)}
      >
        Previous
      </Button>

      {pages.map((n) => (
        <Button
          key={n}
          type="button"
          variant={n === page ? "outline" : "ghost"}
          size="sm"
          aria-current={n === page ? "page" : undefined}
          onClick={() => onPageChangeAction(n)}
          className={cn(
            "min-w-9 tabular-nums",
            n === page && "border-soraxi-green/40 text-soraxi-green",
          )}
        >
          {n}
        </Button>
      ))}

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChangeAction(page + 1)}
      >
        Next
      </Button>
    </nav>
  );
}
