import type { Metadata } from "next";
import AdminProductDetail from "@/modules/admin/products/admin-product-detail";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Product Details",
  description: "Full product view with admin moderation actions.",
};

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  return <AdminProductDetail productId={productId} />;
}
