"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { ChevronRight, Menu, Dot } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { categories } from "@/constants/constant";
import type { Category } from "@/types/index";

/**
 * Responsive horizontal category navigation component
 * Features:
 * - Dynamic width calculation using ResizeObserver
 * - Overflow items shown in "View More" sidebar
 * - Desktop tooltips for subcategories
 * - Mobile-friendly collapsible sidebar
 * - Accessible keyboard navigation
 * - Responsive recalculation on screen size changes
 */
function Categories() {
  // State for managing visible categories and sidebar
  const [visibleCategories, setVisibleCategories] =
    useState<Category[]>(categories);
  const [overflowCategories, setOverflowCategories] = useState<Category[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [childedOpen, setChildedOpen] = useState("");
  // const [viewMorewidth, setViewMoreWidth] = useState(0);
  // const [width, setWidth] = useState(0);
  // const [adjustedTotalWidth, setAdjustedTotalWidth] = useState(0);
  // const [adjustedVisibleCount, setAdjustedVisibleCount] = useState(0);

  // Refs for DOM measurements
  const hiddenContainerRef = useRef<HTMLDivElement>(null);
  const hiddenItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const viewMoreRef = useRef<HTMLButtonElement>(null);

  /**
   * Calculate which categories fit in the available container width
   * Uses a two-pass approach to correctly handle "View More" button space.
   */
  const calculateVisibleItems = useCallback(() => {
    if (!containerRef.current || isCalculating) return;

    setIsCalculating(true);

    requestAnimationFrame(() => {
      const container = containerRef.current;
      if (!container) {
        setIsCalculating(false);
        return;
      }

      const containerWidth = container.offsetWidth;
      // setWidth(containerWidth);
      const viewMoreWidth = 141; // Width of "View More" button
      const gap = 24; // gap-6 in Tailwind

      let currentVisibleCount = 0;
      let currentTotalWidth = 0;

      // console.log("width inside", width);
      // console.log("adjustedTotalWidth in side", adjustedTotalWidth);
      // console.log("adjustedVisibleCount in side", adjustedVisibleCount);

      // Pass 1: Determine how many items fit without considering the "View More" button
      for (let i = 0; i < categories.length; i++) {
        // const item = itemsRef.current[i];
        const hiddenItem = hiddenItemsRef.current[i];
        // console.log("resizing", i + 1);
        // console.log("item", `${i + 1} ${item?.offsetWidth}`);
        // console.log("hiddenItem", `${i + 1} ${hiddenItem?.offsetWidth}`);
        if (!hiddenItem) continue;

        const itemWidth = hiddenItem.offsetWidth;
        const widthToAdd = itemWidth + (i > 0 ? gap : 0);

        if (currentTotalWidth + widthToAdd <= containerWidth) {
          currentTotalWidth += widthToAdd;
          currentVisibleCount++;
        } else {
          break; // Item doesn't fit
        }
      }

      // Pass 2: Adjust for the "View More" button if there's an overflow
      if (currentVisibleCount < categories.length) {
        let adjustedVisibleCount = 0;
        let adjustedTotalWidth = 0;

        for (let i = 0; i < categories.length; i++) {
          // const item = itemsRef.current[i];
          const hiddenItem = hiddenItemsRef.current[i];
          if (!hiddenItem) continue;

          const itemWidth = hiddenItem.offsetWidth;
          const widthToAdd = itemWidth + (i > 0 ? gap : 0);
          // console.log(
          //   "adjustedTotalWidth + widthToAdd + viewMoreWidth + gap",
          //   adjustedTotalWidth + widthToAdd + viewMoreWidth + gap
          // );

          // Check if current item + "View More" button fits
          if (
            adjustedTotalWidth + widthToAdd + viewMoreWidth + gap <=
            containerWidth
          ) {
            adjustedTotalWidth += widthToAdd;
            adjustedVisibleCount++;
          } else {
            break;
          }
        }
        // setAdjustedVisibleCount(adjustedVisibleCount);
        // setAdjustedTotalWidth(adjustedTotalWidth);
        setVisibleCategories(categories.slice(0, adjustedVisibleCount));
        setOverflowCategories(categories.slice(adjustedVisibleCount));
      } else {
        // All categories fit, no "View More" needed
        setVisibleCategories(categories);
        setOverflowCategories([]);
      }

      setIsCalculating(false);
    });
  }, [isCalculating]);

  // console.log("width out side", width);
  // console.log("adjustedTotalWidth out side", adjustedTotalWidth);
  // console.log("adjustedVisibleCount out side", adjustedVisibleCount);

  /**
   * Set up ResizeObserver to monitor container width changes
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let timeoutId: NodeJS.Timeout;

    const resizeObserver = new ResizeObserver(() => {
      // Clear any existing timeout to debounce
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        calculateVisibleItems();
      }, 50); // Debounce time
    });

    resizeObserver.observe(container);

    // Initial calculation after a short delay to ensure DOM is ready
    const initialTimeout = setTimeout(calculateVisibleItems, 100);

    return () => {
      resizeObserver.disconnect();
      clearTimeout(timeoutId); // Clear debounce timeout on unmount
      clearTimeout(initialTimeout); // Clear initial timeout on unmount
    };
  }, [calculateVisibleItems]);

  /**
   * Handle category expansion in mobile sidebar
   */
  const toggleCategoryExpansion = (categorySlug: string) => {
    setExpandedCategory(
      expandedCategory === categorySlug ? null : categorySlug
    );
  };

  /**
   * Render a category link with proper accessibility attributes
   */
  const CategoryLink = ({
    category,
    className = "",
  }: {
    category: Category;
    className?: string;
  }) => (
    <Link
      href={`/category/${category.slug}`}
      className={`whitespace-nowrap text-base font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm ${className}`}
      aria-label={`Browse ${category.name} category`}
    >
      {category.name}
    </Link>
  );

  /**
   * Render subcategory links with improved visual styling
   */
  const SubcategoryLinks = ({
    subcategories,
    categorySlug,
    inSidebar = false,
    childedOpen = "",
  }: {
    subcategories: Category["subcategories"];
    categorySlug: string;
    inSidebar?: boolean;
    childedOpen?: string;
  }) => (
    <div
      className={inSidebar ? "space-y-1" : "grid gap-1"}
      onMouseEnter={() => {
        setChildedOpen(childedOpen);
      }}
      onMouseLeave={() => {
        setChildedOpen("");
      }}
    >
      {/* eslint-disable-next-line @typescript-eslint/no-unused-vars */}
      {subcategories.map((subcategory, _index) => (
        <Link
          key={subcategory.slug}
          href={`/category/${categorySlug}/${subcategory.slug}`}
          className={`
            text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded
            ${
              inSidebar
                ? "flex items-center gap-2 py-2 px-3 hover:bg-accent/50 text-muted-foreground hover:text-foreground"
                : "p-2 hover:bg-accent rounded"
            }
          `}
          onClick={() => setIsSidebarOpen(false)}
        >
          {inSidebar && <Dot className="w-4 h-4 text-muted-foreground" />}
          {subcategory.name}
        </Link>
      ))}
    </div>
  );

  return (
    <div className="w-full">
      {/* Hidden container used for the calculation */}
      <div
        ref={hiddenContainerRef}
        className="flex items-center gap-6 overflow-auto h-0"
        role="navigation"
        aria-label="Category navigation"
      >
        <TooltipProvider delayDuration={200}>
          {/* Visible Categories */}
          {categories.map((category, index) => (
            <div
              key={category.slug}
              ref={(el) => {
                hiddenItemsRef.current[index] = el;
              }}
              className="flex-shrink-0"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <CategoryLink
                      className={`hover:text-soraxi-green ${
                        category.name === childedOpen ? "text-soraxi-green" : ""
                      }`}
                      category={category}
                    />
                  </div>
                </TooltipTrigger>
                {category.subcategories.length > 0 && (
                  <TooltipContent
                    side="bottom"
                    align="center"
                    className="w-48 p-3 mx-2"
                    sideOffset={8}
                  >
                    <div className="space-y-2">
                      <div className="font-medium text-sm text-foreground border-b pb-1">
                        {category.name}
                      </div>
                      <SubcategoryLinks
                        subcategories={category.subcategories}
                        categorySlug={category.slug}
                        childedOpen={category.name}
                      />
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          ))}

          {/* View More Button */}
          {overflowCategories.length > 0 && (
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  ref={viewMoreRef}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 whitespace-nowrap bg-transparent"
                  aria-label={`View ${overflowCategories.length} more categories`}
                >
                  <Menu className="w-4 h-4 mr-2" />
                  View More ({overflowCategories.length})
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-80 sm:w-96 overflow-y-auto"
              >
                <SheetHeader className="">
                  <SheetTitle className="flex items-center justify-between text-lg">
                    All Categories
                  </SheetTitle>
                  <Separator />
                </SheetHeader>

                <div className="">
                  {/* All Categories in Sidebar with improved styling */}
                  {categories.map((category, index) => (
                    <div key={category.slug} className="">
                      {category.subcategories.length > 0 ? (
                        <Collapsible
                          open={expandedCategory === category.slug}
                          onOpenChange={() =>
                            toggleCategoryExpansion(category.slug)
                          }
                        >
                          <div className="flex items-center justify-between group">
                            <CategoryLink
                              category={category}
                              className="flex-1 py-3 px-3 hover:bg-accent/50 rounded-md font-medium text-foreground"
                            />
                            <CollapsibleTrigger
                              asChild
                              className="text-primary"
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-2 transition-opacity" // Removed opacity-0 and group-hover
                                aria-label={`${
                                  expandedCategory === category.slug
                                    ? "Collapse"
                                    : "Expand"
                                } ${category.name} subcategories`}
                              >
                                <ChevronRight
                                  className={`w-4 h-4 transition-transform duration-200 ${
                                    expandedCategory === category.slug
                                      ? "rotate-90"
                                      : ""
                                  }`}
                                />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent className="ml-3 mt-1">
                            <div className="border-l-2 border-muted pl-3 space-y-1">
                              <SubcategoryLinks
                                subcategories={category.subcategories}
                                categorySlug={category.slug}
                                inSidebar={true}
                              />
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <CategoryLink
                          category={category}
                          className="block py-3 px-3 hover:bg-accent/50 rounded-md font-medium text-foreground"
                        />
                      )}
                      {index < categories.length - 1 && (
                        <Separator className="my-2" />
                      )}
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </TooltipProvider>
      </div>

      {/* Desktop/Tablet Navigation */}
      <div
        ref={containerRef}
        className="flex items-center gap-6 overflow-hidden"
        role="navigation"
        aria-label="Category navigation"
      >
        <TooltipProvider delayDuration={200}>
          {/* Visible Categories */}
          {visibleCategories.map((category, index) => (
            <div
              key={category.slug}
              ref={(el) => {
                itemsRef.current[index] = el;
              }}
              className="flex-shrink-0"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <CategoryLink
                      className={`hover:text-soraxi-green ${
                        category.name === childedOpen ? "text-soraxi-green" : ""
                      }`}
                      category={category}
                    />
                  </div>
                </TooltipTrigger>
                {category.subcategories.length > 0 && (
                  <TooltipContent
                    side="bottom"
                    align="center"
                    className="w-48 p-3 mx-2"
                    sideOffset={8}
                  >
                    <div className="space-y-2">
                      <div className="font-medium text-sm text-foreground border-b pb-1">
                        {category.name}
                      </div>
                      <SubcategoryLinks
                        subcategories={category.subcategories}
                        categorySlug={category.slug}
                        childedOpen={category.name}
                      />
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          ))}

          {/* View More Button */}
          {overflowCategories.length > 0 && (
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
              <SheetTrigger asChild>
                <Button
                  ref={viewMoreRef}
                  variant="outline"
                  size="sm"
                  className="flex-shrink-0 whitespace-nowrap bg-transparent"
                  aria-label={`View ${overflowCategories.length} more categories`}
                >
                  <Menu className="w-4 h-4 mr-2" />
                  View More ({overflowCategories.length})
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-80 sm:w-96 overflow-y-auto"
              >
                <SheetHeader className="">
                  <SheetTitle className="flex items-center justify-between text-lg">
                    All Categories
                  </SheetTitle>
                  <Separator />
                </SheetHeader>

                <div className="">
                  {/* All Categories in Sidebar with improved styling */}
                  {categories.map((category, index) => (
                    <div key={category.slug} className="">
                      {category.subcategories.length > 0 ? (
                        <Collapsible
                          open={expandedCategory === category.slug}
                          onOpenChange={() =>
                            toggleCategoryExpansion(category.slug)
                          }
                        >
                          <div className="flex items-center justify-between group">
                            <CategoryLink
                              category={category}
                              className="flex-1 py-3 px-3 hover:bg-accent/50 rounded-md font-medium text-foreground"
                            />
                            <CollapsibleTrigger
                              asChild
                              className="text-primary"
                            >
                              <Button
                                variant="ghost"
                                size="sm"
                                className="p-2 transition-opacity" // Removed opacity-0 and group-hover
                                aria-label={`${
                                  expandedCategory === category.slug
                                    ? "Collapse"
                                    : "Expand"
                                } ${category.name} subcategories`}
                              >
                                <ChevronRight
                                  className={`w-4 h-4 transition-transform duration-200 ${
                                    expandedCategory === category.slug
                                      ? "rotate-90"
                                      : ""
                                  }`}
                                />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                          <CollapsibleContent className="ml-3 mt-1">
                            <div className="border-l-2 border-muted pl-3 space-y-1">
                              <SubcategoryLinks
                                subcategories={category.subcategories}
                                categorySlug={category.slug}
                                inSidebar={true}
                              />
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      ) : (
                        <CategoryLink
                          category={category}
                          className="block py-3 px-3 hover:bg-accent/50 rounded-md font-medium text-foreground"
                        />
                      )}
                      {index < categories.length - 1 && (
                        <Separator className="my-2" />
                      )}
                    </div>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          )}
        </TooltipProvider>
      </div>
    </div>
  );
}

export default Categories;
