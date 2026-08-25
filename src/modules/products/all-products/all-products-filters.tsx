"use client";

import { useEffect, useMemo, useState } from "react";
import debounce from "debounce";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  SoraxiCard,
  SoraxiCardContent,
  SoraxiCardHeader,
  SoraxiCardTitle,
} from "@/components/ui/soraxi-card";
import { categories } from "@/constants/constant";
import { cn } from "@/lib/utils";
import { addNairaSign } from "@/lib/utils/naira";

export interface AllProductsFilters {
  categories: string[];
  maxPrice: number;
  inStock: boolean;
}

export const MAX_PRICE_NAIRA = 500_000;

export const DEFAULT_FILTERS: AllProductsFilters = {
  categories: [],
  maxPrice: MAX_PRICE_NAIRA,
  inStock: false,
};

interface AllProductsFiltersPanelProps {
  filters: AllProductsFilters;
  onFiltersChangeAction: (filters: AllProductsFilters) => void;
  className?: string;
}

/**
 * Filter rail for the all-products listing.
 *
 * Differs from the category page's `ProductFilters` in the one way that
 * matters: category is a filter here rather than a fixed property of the route,
 * so it is a multi-select rather than absent.
 *
 * The price slider is debounced but the checkboxes are not. Dragging a slider
 * emits a value per pixel of travel — refetching on each would be dozens of
 * queries per gesture — whereas a checkbox emits once and should feel instant.
 */
export function AllProductsFiltersPanel({
  filters,
  onFiltersChangeAction,
  className,
}: AllProductsFiltersPanelProps) {
  const [localPrice, setLocalPrice] = useState(filters.maxPrice);

  // Keep the slider in step when filters are reset from outside this panel.
  useEffect(() => {
    setLocalPrice(filters.maxPrice);
  }, [filters.maxPrice]);

  const commitPrice = useMemo(
    () =>
      debounce((maxPrice: number) => {
        onFiltersChangeAction({ ...filters, maxPrice });
      }, 400),
    [filters, onFiltersChangeAction],
  );

  const toggleCategory = (slug: string, checked: boolean) => {
    const next = checked
      ? [...filters.categories, slug]
      : filters.categories.filter((s) => s !== slug);

    onFiltersChangeAction({ ...filters, categories: next });
  };

  const isDirty =
    filters.categories.length > 0 ||
    filters.maxPrice !== MAX_PRICE_NAIRA ||
    filters.inStock;

  return (
    <SoraxiCard className={cn("h-fit", className)}>
      <SoraxiCardHeader>
        <SoraxiCardTitle className={cn("text-base")}>Category</SoraxiCardTitle>
      </SoraxiCardHeader>

      <SoraxiCardContent className={cn("space-y-6")}>
        <div className={cn("space-y-3")}>
          {categories.map((category) => (
            <div key={category.slug} className={cn("flex items-center gap-2")}>
              <Checkbox
                id={`category-${category.slug}`}
                checked={filters.categories.includes(category.slug)}
                onCheckedChange={(checked) =>
                  toggleCategory(category.slug, checked === true)
                }
              />
              <Label
                htmlFor={`category-${category.slug}`}
                className={cn("text-sm font-normal")}
              >
                {category.name}
              </Label>
            </div>
          ))}
        </div>

        <div className={cn("space-y-3")}>
          <p className={cn("text-sm font-medium")}>Max price</p>

          <Slider
            value={[localPrice]}
            min={0}
            max={MAX_PRICE_NAIRA}
            step={1000}
            aria-label="Maximum price"
            onValueChange={([value]) => {
              setLocalPrice(value);
              commitPrice(value);
            }}
          />

          <div
            className={cn(
              "flex items-center justify-between text-xs text-muted-foreground",
            )}
          >
            <span>{addNairaSign(0)}</span>
            <span className={cn("text-soraxi-green")}>
              Up to {addNairaSign(localPrice)}
            </span>
          </div>
        </div>

        <div className={cn("space-y-3")}>
          <p className={cn("text-sm font-medium")}>Availability</p>

          {/*
            The design also showed a "Verified stores only" checkbox. It is not
            rendered: every product this page can return is already verified —
            `ProductRepository.getPublicProducts` hardcodes `verified: true` —
            so the control could only ever be a no-op switch.
          */}
          <div className={cn("flex items-center gap-2")}>
            <Checkbox
              id="filter-in-stock"
              checked={filters.inStock}
              onCheckedChange={(checked) =>
                onFiltersChangeAction({
                  ...filters,
                  inStock: checked === true,
                })
              }
            />
            <Label
              htmlFor="filter-in-stock"
              className={cn("text-sm font-normal")}
            >
              In stock
            </Label>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={!isDirty}
          onClick={() => onFiltersChangeAction(DEFAULT_FILTERS)}
          className={cn("w-full")}
        >
          Reset filters
        </Button>
      </SoraxiCardContent>
    </SoraxiCard>
  );
}
