import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface CategoryHeaderProps {
  categoryName: string;
  categorySlug: string;
  subcategoryName?: string;
}

/**
 * Server-rendered so the heading and the trail are in the initial HTML.
 * The breadcrumb doubles as the link back up to the parent category, which is
 * the only route from a subcategory to its siblings.
 */
export function CategoryHeader({
  categoryName,
  categorySlug,
  subcategoryName,
}: CategoryHeaderProps) {
  return (
    <div className="space-y-4">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            {subcategoryName ? (
              <BreadcrumbLink asChild>
                <Link href={`/category/${categorySlug}`}>{categoryName}</Link>
              </BreadcrumbLink>
            ) : (
              <BreadcrumbPage>{categoryName}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
          {subcategoryName && (
            <>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{subcategoryName}</BreadcrumbPage>
              </BreadcrumbItem>
            </>
          )}
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
        {subcategoryName || categoryName}
      </h1>
    </div>
  );
}
