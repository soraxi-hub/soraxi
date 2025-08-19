import { ProductEditForm } from "@/modules/store/components/product-edit-form";
import { redirect } from "next/navigation";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";
import { caller } from "@/trpc/server";
import { generateStoreMetadata } from "@/lib/helpers/generate-store-metadata";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateStoreMetadata(
    "Edit Product",
    "Edit and update your product details including pricing, descriptions, and inventory. Keep your listings accurate and up to date to ensure a smooth shopping experience for customers."
  );
}

interface ProductEditPageProps {
  params: Promise<{
    store_id: string;
    productId: string;
  }>;
}

/**
 * Product Edit Page
 * Page for stores to edit existing products
 */
export default async function ProductEditPage({
  params,
}: ProductEditPageProps) {
  const { store_id, productId } = await params;

  // Server-side check for store session (though client-side check is also in ProductForm)
  const storeSession = await getStoreFromCookie();
  if (!storeSession || storeSession.id !== store_id) {
    redirect(`/login?redirect=/store/${store_id}/products/${productId}/edit`);
  }

  const data = await caller.storeProducts.getStoreProductById({
    id: productId,
  });

  const productData = data.product;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <ProductEditForm
          storeId={store_id}
          productId={productId}
          initialProductData={productData}
        />
      </div>
    </div>
  );
}
