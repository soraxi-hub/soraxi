// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import WithdrawalRequestDetail from "@/modules/admin/finance/withdrawal-requests/withdrawal-request-detail";

interface WithdrawalRequestDetailPageProps {
  params: {
    requestId: string;
  };
}

/**
 * Admin Withdrawal Request Detail Page
 * Displays comprehensive details of a single withdrawal request and allows admin actions.
 */
export default function AdminWithdrawalRequestDetailPage({
  params,
}: WithdrawalRequestDetailPageProps) {
  const { requestId } = params;

  return <WithdrawalRequestDetail requestId={requestId} />;
}
