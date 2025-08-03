"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductSortProps {
  sortBy: "newest" | "price-asc" | "price-desc" | "rating-desc" | undefined;
  onSortChangeAction: (
    value: "newest" | "price-asc" | "price-desc" | "rating-desc"
  ) => void;
  totalProducts: number;
}

export function ProductSort({
  sortBy,
  onSortChangeAction,
  totalProducts,
}: ProductSortProps) {
  return (
    <div className="flex items-center justify-between w-full">
      <p className="text-sm text-muted-foreground hidden md:inline-flex">
        Showing {totalProducts} products
      </p>

      <div className="flex items-center gap-4">
        {/* Sort Dropdown */}
        <Select value={sortBy} onValueChange={onSortChangeAction}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest First</SelectItem>
            <SelectItem value="price-asc">Price: Low to High</SelectItem>
            <SelectItem value="price-desc">Price: High to Low</SelectItem>
            <SelectItem value="rating-desc">Highest Rated</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
