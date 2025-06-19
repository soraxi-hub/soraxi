import Link from "next/link";

import CartCount from "@/components/cart-count";
import UserAvatar from "@/components/userAvater";
import { siteConfig } from "@/config/site";
import { playpenSans } from "@/constants/constant";
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
export async function StoreHeader() {
  const user = await getUserFromCookie();
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Main Header Row */}
      <div className="container mx-auto px-4 py-4">
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

          {/* User Actions */}
          <div className="flex items-center gap-2">
            <CartCount />
            <UserAvatar userName={user?.firstName} />
          </div>
        </div>
      </div>
    </header>
  );
}
