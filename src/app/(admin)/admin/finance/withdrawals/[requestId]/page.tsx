// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import WithdrawalRequestDetail from "@/modules/admin/finance/withdrawal-requests/withdrawal-request-detail";

interface WithdrawalRequestDetailPageProps {
  params: Promise<{
    requestId: string;
  }>;
}

/**
 * Admin Withdrawal Request Detail Page
 * Displays comprehensive details of a single withdrawal request and allows admin actions.
 */
export default async function AdminWithdrawalRequestDetailPage({
  params,
}: WithdrawalRequestDetailPageProps) {
  const { requestId } = await params;

  return <WithdrawalRequestDetail requestId={requestId} />;
}
