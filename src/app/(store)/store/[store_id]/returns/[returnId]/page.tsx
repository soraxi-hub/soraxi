import { Suspense } from "react";
import { ReturnDetailView } from "@/modules/store/returns/ReturnDetailView";
import { redirect } from "next/navigation";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";

interface ReturnDetailPageProps {
  params: Promise<{ store_id: string; returnId: string }>;
}

export default async function ReturnDetailPage({
  params,
}: ReturnDetailPageProps) {
  const { store_id, returnId } = await params;

  // Check store session
  const session = await getStoreFromCookie();
  if (!session || session.id !== store_id) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <Suspense fallback={<div>Loading return details...</div>}>
          <ReturnDetailView storeId={store_id} returnId={returnId} />
        </Suspense>
      </div>
    </div>
  );
}
