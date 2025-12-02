"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import { helpCenterCategories } from "@/lib/utils/mdx-utils/help-center-data";
import { cn } from "@/lib/utils";
import { ScrollArea } from "./ui/scroll-area";
import { Button } from "./ui/button";

export function SidebarNav({ className }: { className?: string }) {
  const pathname = usePathname();
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  useEffect(() => {
    const activeCategory = helpCenterCategories.find((category) =>
      category.pages.some((page) => pathname === `/docs/${page.slug}`)
    );

    if (activeCategory) {
      setExpandedCategories((prev) =>
        prev.includes(activeCategory.id) ? prev : [...prev, activeCategory.id]
      );
    }
  }, [pathname]);

  return (
    <aside className={cn("max-h-screen sticky top-0 md:top-14", className)}>
      <ScrollArea className="w-72 h-full md:h-[calc(100vh-2rem)] px-4 py-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-primary mb-2">Help Center</h1>
          <p className="text-sm text-muted-foreground">Soraxi Documentation</p>
        </div>

        <nav className="space-y-2 pt-4">
          {helpCenterCategories.map((category) => (
            <div key={category.id}>
              <Button
                onClick={() => toggleCategory(category.id)}
                className={cn(
                  "w-full text-sm font-semibold flex items-center justify-between shadow-none",
                  expandedCategories.includes(category.id) &&
                    category.pages.some(
                      (page) => pathname === `/docs/${page.slug}`
                    )
                    ? "bg-primary/10 text-primary hover:bg-primary/10 hover:text-primary"
                    : "text-foreground bg-transparent hover:bg-transparent hover:text-soraxi-green-hover"
                )}
              >
                <span>{category.name}</span>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 transition-transform",
                    expandedCategories.includes(category.id) && "rotate-180"
                  )}
                />
              </Button>

              {expandedCategories.includes(category.id) && (
                <div className="mt-2 space-y-1 ml-2">
                  {category.pages.map((page) => (
                    <Link
                      key={page.id}
                      href={`/docs/${page.slug}`}
                      className={cn(
                        "block px-3 py-2 rounded-lg text-xs transition-colors",
                        pathname === `/docs/${page.slug}`
                          ? "text-soraxi-green hover:text-soraxi-green-hover font-semibold"
                          : "text-foreground/70 hover:text-soraxi-green-hover hover:bg-muted"
                      )}
                    >
                      {page.title}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </aside>
  );
}
