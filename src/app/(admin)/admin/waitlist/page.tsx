import type { Metadata } from "next";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vendor Applications",
  description:
    "Paginated table of vendor applications with filtering and bulk actions.",
};

import AdminWaitlistList from "@/modules/admin/waitlist/admin-waitlist-list";

export default function AdminWaitlistListPage() {
  return <AdminWaitlistList />;
}
