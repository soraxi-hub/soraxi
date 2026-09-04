import type { Metadata } from "next";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Payout Details",
  description:
    "Full breakdown of a single vendor payout.",
};

import AdminPayoutDetail from "@/modules/admin/payouts/payout-record-detail";

interface PageProps {
  params: Promise<{ payoutRecordId: string }>;
}

export default async function AdminPayoutDetailPage({ params }: PageProps) {
  const { payoutRecordId } = await params;
  return <AdminPayoutDetail payoutRecordId={payoutRecordId} />;
}
