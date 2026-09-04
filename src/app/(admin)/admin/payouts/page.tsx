import type { Metadata } from "next";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payouts",
  description:
    "Vendor payout records across the platform.",
};

import AdminPayoutList from "@/modules/admin/payouts/payout-record-list";

export default function AdminWithdrawalsPage() {
  return <AdminPayoutList />;
}
