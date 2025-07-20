import { ProductModeration } from "@/modules/admin/products/ProductModeration";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

/**
 * Admin Products Page
 * Product moderation interface for administrators
 */
export default function AdminProductsPage() {
  return <ProductModeration />;
}
