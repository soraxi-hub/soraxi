import { Suspense } from "react";
import Link from "next/link";

import CartCount from "@/components/cart-count";
import UserAvatar from "@/components/userAvater";
import { siteConfig } from "@/config/site";
import { playpenSans } from "@/constants/constant";
import SearchBar from "@/components/search-bar";
import Categories from "@/components/categories";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";

/**
 * Main header component with responsive design
 * Features:
 * - Sticky positioning with backdrop blur
 * - Mobile-first responsive layout
 * - Integrated category navigation
 * - Search functionality
 * - User actions (cart, profile)
 */
export async function HomeHeader() {
  const user = await getUserFromCookie();
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Main Header Row */}
      <div className="mx-auto max-w-7xl px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link
              href="/"
              className={`text-2xl sm:text-3xl font-semibold hover:opacity-80 transition-opacity ${playpenSans.className}`}
            >
              {siteConfig.name}
            </Link>
          </div>

          {/* Desktop Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <Suspense
              fallback={
                <div className="w-full h-10 bg-muted animate-pulse rounded-md" />
              }
            >
              <SearchBar />
            </Suspense>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-2">
            <CartCount />
            <UserAvatar userName={user?.firstName} />
          </div>
        </div>

        {/* Mobile Search Bar */}
        <div className="md:hidden mt-4">
          <Suspense
            fallback={
              <div className="w-full h-10 bg-muted animate-pulse rounded-md" />
            }
          >
            <SearchBar />
          </Suspense>
        </div>
      </div>

      {/* Category Navigation */}
      <div className="border-t bg-background/50">
        <div className="mx-auto max-w-7xl px-6 py-3">
          <Categories />
        </div>
      </div>
    </header>
  );
}
