import { HomeFooter } from "@/components/layout/home/home-footer";
import { HomeHeader } from "@/components/layout/home/home-nav";
import { MobileSidebar } from "@/components/mobile-sidebar";
import { SidebarNav } from "@/components/sidebar-nav";
import { MobileTableOfContents } from "@/lib/utils/mdx-utils/mobile-table-of-contents";
import { Fragment, type ReactNode } from "react";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <Fragment>
      <HomeHeader />
      <div className="md:flex min-h-screen">
        {/* Mobile sidebar (sheet) */}
        <div className="border-b md:border-none fixed top-[115px] sm:top-[120px] bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 w-full">
          <div className="mx-auto max-w-7xl px-6 flex items-center justify-between">
            <MobileSidebar />
            <MobileTableOfContents />
          </div>
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:block">
          <SidebarNav />
        </div>
        <main className="flex-1 w-full pt-6 lg:pt-0">{children}</main>
      </div>
      <HomeFooter />
    </Fragment>
  );
}
