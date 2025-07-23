import { RefundApprovalQueue } from "@/modules/admin/refunds/RefundApprovalQueue";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

/**
 * Admin Refund Approval Queue Page
 *
 * Main page for managing sub-orders that require manual refund approval.
 * Shows sub-orders marked as Canceled, Returned, or Failed Delivery
 * where escrow has not been processed yet.
 */
export default function AdminRefundQueuePage() {
  return <RefundApprovalQueue />;
}
