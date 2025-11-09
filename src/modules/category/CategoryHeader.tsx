"use client";

import { Badge } from "@/components/ui/badge";

interface CategoryHeaderProps {
  categoryName: string;
  subcategoryName?: string;
  productCount: number;
  categorySlug: string;
}

export function CategoryHeader({
  categoryName,
  subcategoryName,
  productCount,
}: CategoryHeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {subcategoryName || categoryName}
          </h1>
          <p className="text-muted-foreground mt-2">
            {productCount} {productCount === 1 ? "product" : "products"} found
          </p>
        </div>
        <Badge variant="secondary" className="text-sm hidden sm:inline-flex">
          {categoryName}
        </Badge>
      </div>
    </div>
  );
}
