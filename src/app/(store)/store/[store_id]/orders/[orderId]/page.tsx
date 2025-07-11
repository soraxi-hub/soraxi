import OrderDetailView from "@/modules/store/orders/order-detail-view";
import { Suspense } from "react";

async function Page(props: {
  params: Promise<{ store_id: string; orderId: string }>;
}) {
  const { orderId } = await props.params;
  return (
    <Suspense fallback={`My Products`}>
      <div className="min-h-screen bg-background py-8">
        <div className="container mx-auto px-4">
          <OrderDetailView orderId={orderId} />
        </div>
      </div>
    </Suspense>
  );
}

export default Page;
