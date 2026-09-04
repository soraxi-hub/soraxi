import type { Metadata } from "next";
// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Orders",
  description: "Order monitoring across the platform.",
};

import OrderMonitoring from "@/modules/admin/orders/order-monitoring";

export default function AdminOrdersPage() {
  return <OrderMonitoring />;
}
