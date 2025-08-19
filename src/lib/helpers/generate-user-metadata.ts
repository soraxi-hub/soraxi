import type { Metadata } from "next";
import { getUserFromCookie } from "./get-user-from-cookie";
import { siteConfig } from "@/config/site";

/**
 * Generate consistent metadata for user-only pages.
 * @param page - Page name, e.g. "Edit Profile", "Wishlist", "Orders"
 * @param description - Page description
 */
export async function generateUserMetadata(
  page: "Edit Profile" | "My Wishlist" | "My Orders",
  description: string
): Promise<Metadata> {
  const user = await getUserFromCookie();

  if (!user) {
    return {
      title: `Sign In | ${siteConfig.name}`,
      description:
        "Sign in to your account to manage your profile, track orders, and enjoy a personalized shopping experience.",
    };
  }

  return {
    title: `${page} | ${siteConfig.name}`,
    description,
  };
}
