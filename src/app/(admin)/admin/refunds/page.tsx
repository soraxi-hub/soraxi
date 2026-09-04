import type { Metadata } from "next";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Refunds",
  description:
    "Refund records across the platform.",
};

import AdminRefundList from "@/modules/admin/refunds/refund-record-list";

export default function AdminRefundListPage() {
  return <AdminRefundList />;
}
