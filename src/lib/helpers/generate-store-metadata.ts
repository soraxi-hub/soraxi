import type { Metadata } from "next";
import { getStoreFromCookie } from "./get-store-from-cookie";
import { siteConfig } from "@/config/site";

export async function generateStoreMetadata(
  page:
    | "Dashboard"
    | "Orders"
    | "Order Details"
    | "Payout Setup"
    | "Shipping Setup"
    | "Wallet"
    | "Withdrawal Details"
    | "Product Management"
    | "Edit Product"
    | "Upload Product",
  description: string
): Promise<Metadata> {
  const store = await getStoreFromCookie();

  if (!store) {
    return {
      title: `Sign In | ${siteConfig.name}`,
      description:
        "Sign in to your account to manage your store, track orders, and update your profile on the platform.",
    };
  }

  return {
    title: `${showStoreName(page, store.name)} ${page} ${showStoreNameAfterPage(
      page,
      store.name
    )} | ${siteConfig.name}`,
    description,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
      },
    },
  };
}

const showStoreName = (page: string, storeName: string) => {
  const show = ["Dashboard", "Wallet"].includes(page);
  return show ? `${storeName}'s ` : ``;
};

const showStoreNameAfterPage = (page: string, storeName: string) => {
  const show = ["Dashboard", "Wallet"].includes(page);
  return show ? `` : `| ${storeName}`;
};
