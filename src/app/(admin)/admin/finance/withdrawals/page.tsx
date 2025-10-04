// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import WithdrawalRequestList from "@/modules/admin/finance/withdrawal-requests/withdrawal-request-list";

/**
 * Admin Withdrawal Requests Page
 * Provides an interface for administrators to view and manage store withdrawal requests.
 */
export default function AdminWithdrawalRequestsPage() {
  return <WithdrawalRequestList />;
}
