"use client";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import { AdminLayout } from "@/modules/admin/admin-layout";
import { FinancePanel } from "@/modules/admin/finance/finance-panel";

/**
 * Admin Finance Page
 * Financial management interface for administrators
 */
export default function AdminFinancePage() {
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
      <FinancePanel />
    </AdminLayout>
  );
}
