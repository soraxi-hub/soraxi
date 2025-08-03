import RefundDetailView from "@/modules/admin/refunds/RefundDetailView";

/**
 * Admin Refund Detail Page
 *
 * Detailed view for a specific sub-order in the refund approval queue.
 * Provides complete information and refund approval actions.
 */
export default async function AdminRefundDetailPage({
  params,
}: {
  params: Promise<{ subOrderId: string }>;
}) {
  const { subOrderId } = await params;

  return <RefundDetailView subOrderId={subOrderId} />;
}
