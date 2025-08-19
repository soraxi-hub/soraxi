import { generateStoreMetadata } from "@/lib/helpers/generate-store-metadata";
import { ProductUploadForm } from "@/modules/store/components/product-upload-form";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateStoreMetadata(
    "Upload Product",
    "Upload new products to your store by adding images, descriptions, pricing, and inventory details. Create polished listings to showcase your products and attract customers."
  );
}

/**
 * Product Upload Page
 * Page for stores to upload new products
 */
export default async function ProductUploadPage(props: {
  params: Promise<{ store_id: string }>;
}) {
  const { store_id } = await props.params;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <ProductUploadForm storeId={store_id} />
      </div>
    </div>
  );
}
