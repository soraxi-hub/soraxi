import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import { AllProductsPage } from "@/modules/products/all-products/all-products-page";

export const metadata: Metadata = {
  title: `All products | ${siteConfig.name}`,
  description:
    "Browse everything on sale from verified vendors — filter by category, price and availability.",
};

export default function Page() {
  return <AllProductsPage />;
}
