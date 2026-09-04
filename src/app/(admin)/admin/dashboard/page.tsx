import type { Metadata } from "next";
import { AdminDashboardContent } from "@/modules/admin/components/admin-dashboard";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "Platform overview: orders, revenue, disputes, and vendor activity at a glance.",
};

export default function AdminDashboardPage() {
  return <AdminDashboardContent />;
}
