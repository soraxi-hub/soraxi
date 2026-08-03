import Link from "next/link";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface StoreBreadcrumbProps {
  storeName: string;
}

/**
 * Home / Stores / {store name}
 *
 * Hidden below `sm` — on a phone the breadcrumb costs a row of vertical space
 * for navigation the back gesture already provides. Matches the convention on
 * the product detail page.
 */
export function StoreBreadcrumb({ storeName }: StoreBreadcrumbProps) {
  return (
    <Breadcrumb className="mb-6 hidden sm:flex">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link href="/">Home</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        {/* Rendered as plain text, not a link: there is no store directory
            route yet, and a dead crumb is worse than an inert one. */}
        <BreadcrumbItem>
          <span>Stores</span>
        </BreadcrumbItem>

        <BreadcrumbSeparator />

        <BreadcrumbItem>
          <BreadcrumbPage className="font-medium">{storeName}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
