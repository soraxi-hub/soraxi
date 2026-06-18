export const dynamic = "force-dynamic";

import AdminWaitlistList from "@/modules/admin/waitlist/admin-waitlist-list";

/**
 * Admin Waitlist List Page
 * Paginated table of all vendor applications with filtering and bulk actions
 * Route: /admin/waitlist
 */
export default function AdminWaitlistListPage() {
  return <AdminWaitlistList />;
}
