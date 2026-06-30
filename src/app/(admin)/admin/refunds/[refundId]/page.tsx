export const dynamic = "force-dynamic";

import AdminRefundDetail from "@/modules/admin/refunds/refund-record-detail";

interface PageProps {
  params: Promise<{ refundId: string }>;
}

export default async function AdminPayoutDetailPage({ params }: PageProps) {
  const { refundId } = await params;
  return <AdminRefundDetail refundId={refundId} />;
}
