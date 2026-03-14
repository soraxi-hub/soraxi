"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { categories } from "@/constants/constant";

interface RequestFiltersProps {
  selectedCategories: string[];
  onCategoryChange: (categories: string[]) => void;
}

const AVAILABLE_CATEGORIES = categories.map((cat) => cat.name);

export function RequestFilters({
  selectedCategories = [],
  onCategoryChange,
}: RequestFiltersProps) {
  const handleToggleCategory = (category: string) => {
    const updated = selectedCategories.includes(category)
      ? selectedCategories.filter((c) => c !== category)
      : [...selectedCategories, category];
    onCategoryChange(updated);
  };

  const handleClearAll = () => {
    onCategoryChange([]);
  };

  const hasFilters = selectedCategories.length > 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Categories</h3>
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            className="h-7 px-2 text-xs"
          >
            Clear
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {AVAILABLE_CATEGORIES.map((category) => (
          <Badge
            key={category}
            variant={
              selectedCategories.includes(category) ? "default" : "secondary"
            }
            className={`cursor-pointer transition-all ${
              selectedCategories.includes(category)
                ? "bg-soraxi-green text-white hover:bg-soraxi-green-hover"
                : "hover:bg-muted"
            }`}
            onClick={() => handleToggleCategory(category)}
          >
            {category}
          </Badge>
        ))}
      </div>
    </div>
  );
}
