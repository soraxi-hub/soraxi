import { Suspense } from "react";
import Link from "next/link";

import CartCount from "@/components/cart-count";
import UserAvatar from "@/components/userAvater";
import { siteConfig } from "@/config/site";
import { playpenSans } from "@/constants/constant";
import SearchBar from "@/components/search-bar";

export async function HomeHeader() {
  return (
    <header className="sticky top-0 z-20 w-full border-b bg-background">
      <div className="mx-auto flex h-16 container items-center justify-between space-x-4 px-2.5 sm:space-x-0">
        <div className="space-y-4">
          <Link
            href="/"
            className={`text-3xl font-semibold ${playpenSans.className}`}
          >
            {siteConfig.name}
          </Link>
        </div>

        <Suspense fallback={`search bar`}>
          <div className="hidden items-center md:inline-flex">
            <SearchBar />
          </div>
        </Suspense>

        <div className="flex items-center space-x-1">
          <div className="hidden md:inline-flex">{/* <Categories /> */}</div>
          <CartCount />

          <UserAvatar />
        </div>
      </div>
    </header>
  );
}
