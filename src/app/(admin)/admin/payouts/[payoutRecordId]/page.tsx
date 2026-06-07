export const dynamic = "force-dynamic";

import AdminPayoutDetail from "@/modules/admin/payouts/payout-record-detail";

interface PageProps {
  params: Promise<{ payoutRecordId: string }>;
}

export default async function AdminPayoutDetailPage({ params }: PageProps) {
  const { payoutRecordId } = await params;
  return <AdminPayoutDetail payoutRecordId={payoutRecordId} />;
}
