import { generateStoreMetadata } from "@/lib/helpers/generate-store-metadata";
import StoreOrdersManagement from "@/modules/store/orders/store-orders";
import { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateStoreMetadata(
    "Orders",
    "Manage all your store orders in one place. Track order statuses, process payments, handle returns, and ensure timely fulfillment for your customers."
  );
}

async function Page(props: { params: Promise<{ store_id: string }> }) {
  const { store_id } = await props.params;
  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <StoreOrdersManagement storeId={store_id} />
      </div>
    </div>
  );
}

export default Page;
