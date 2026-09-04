import type { Metadata } from "next";
import { ProductModeration } from "@/modules/admin/products/product-moderation";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Products",
  description: "Product moderation queue for administrators.",
};

export default function AdminProductsPage() {
  return <ProductModeration />;
}
