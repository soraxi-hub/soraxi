export const dynamic = "force-dynamic";

import AdminOrderDetail from "@/modules/admin/orders/admin-order-detail";

/**
 * Admin Order Detail Page
 * Full order view with financial breakdown and dispute links
 * Route: /admin/orders/[orderId]
 */
export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return <AdminOrderDetail orderId={orderId} />;
}
