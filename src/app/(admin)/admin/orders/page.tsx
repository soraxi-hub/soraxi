"use client";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import { AdminLayout } from "@/modules/admin/AdminLayout";
import { OrderMonitoring } from "@/modules/admin/orders/OrderMonitoring";

/**
 * Admin Orders Page
 * Order monitoring interface for administrators
 */
export default function AdminOrdersPage() {
  // Mock admin data - replace with actual auth
  const admin = {
    id: "1",
    name: "John Admin",
    email: "admin@platform.com",
    roles: ["super_admin"],
    avatar: "/placeholder.svg?height=32&width=32",
  };

  return (
    <AdminLayout admin={admin}>
      <OrderMonitoring />
    </AdminLayout>
  );
}
