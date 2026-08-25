import { Suspense } from "react";
import type { Metadata } from "next";

import { siteConfig } from "@/config/site";
import ProductLoadingSkeleton from "@/modules/skeletons/product-loading-skeleton";
import { AllProductsPage } from "@/modules/products/all-products/all-products-page";

export const metadata: Metadata = {
  title: `All products | ${siteConfig.name}`,
  description:
    "Browse everything on sale from verified vendors — filter by category, price and availability.",
};

export default function Page() {
  // `AllProductsPage` keeps search, sort and page in the URL via nuqs, which
  // reads `useSearchParams`. Without a Suspense boundary that opts the whole
  // route out of prerendering and fails the build.
  return (
    <Suspense fallback={<ProductLoadingSkeleton />}>
      <AllProductsPage />
    </Suspense>
  );
}
