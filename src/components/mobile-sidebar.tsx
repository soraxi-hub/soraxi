"use client";

import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { SidebarNav } from "./sidebar-nav";

export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger className="md:hidden p-2 flex items-center gap-2 text-sm font-medium hover:cursor-pointer hover:text-soraxi-green-hover transition">
        <Menu className="h-6 w-6" /> Menu
      </SheetTrigger>

      <SheetContent side="left" className="p-0 w-72">
        <SidebarNav className="block" />
      </SheetContent>
    </Sheet>
  );
}
