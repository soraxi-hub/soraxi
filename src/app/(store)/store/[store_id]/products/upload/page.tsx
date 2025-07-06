import { ProductUploadForm } from "@/modules/store/components/ProductUploadForm";
// import { redirect } from "next/navigation";

/**
 * Product Upload Page
 * Page for stores to upload new products
 */
export default async function ProductUploadPage(props: {
  params: Promise<{ store_id: string }>;
}) {
  const { store_id } = await props.params;

  // const handleUploadSuccess = () => {
  //   redirect(`/store/${store_id}/products`);
  // };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <ProductUploadForm storeId={store_id} />
      </div>
    </div>
  );
}
