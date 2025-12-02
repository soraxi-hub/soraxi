"use client";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { TableOfContents } from "./table-of-contents";
import { cn } from "../../utils";
import { usePathname } from "next/navigation";

export function MobileTableOfContents() {
  const pathname = usePathname();

  // Only show on "/docs/anything", but not "/docs"
  const shouldShow = pathname.startsWith("/docs") && pathname !== "/docs";

  if (!shouldShow) return null;

  return (
    <Sheet>
      <SheetTrigger className="md:hidden p-2 flex items-center gap-2 text-sm font-medium hover:cursor-pointer hover:text-soraxi-green-hover transition">
        Table of Contents
      </SheetTrigger>

      <SheetContent side="right" className="p-0 w-72">
        <TableOfContents className={cn("overflow-y-auto sticky top-0")} />
      </SheetContent>
    </Sheet>
  );
}
