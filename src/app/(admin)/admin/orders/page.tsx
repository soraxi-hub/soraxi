"use client";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import OrderMonitoring from "@/modules/admin/orders/order-monitoring";

/**
 * Admin Orders Page
 * Order monitoring interface for administrators
 */
export default function AdminOrdersPage() {
  return <OrderMonitoring />;
}
