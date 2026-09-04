import type { Metadata } from "next";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Order Details",
  description:
    "Full order view with financial breakdown and dispute links.",
};

import AdminOrderDetail from "@/modules/admin/orders/admin-order-detail";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  return <AdminOrderDetail orderId={orderId} />;
}
