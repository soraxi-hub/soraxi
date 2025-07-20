import { AdminDashboardContent } from "@/modules/admin/components/admin-dashboard";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

export default function AdminDashboardPage() {
  return <AdminDashboardContent />;
}
