"use client";

import { usePathname } from "next/navigation";
import Categories from "./categories";

export function RouteBasedCategories() {
  const pathName = usePathname();
  const pagesToShowCategory = ["/category/", "/products/"];
  const shouldShowCategory =
    pathName === "/" ||
    pagesToShowCategory.some((path) => pathName.startsWith(path));

  if (!shouldShowCategory) {
    return null;
  }

  return (
    <div className="border-t bg-background/50">
      <div className="mx-auto max-w-7xl px-6 py-3">
        <Categories />
      </div>
    </div>
  );
}
