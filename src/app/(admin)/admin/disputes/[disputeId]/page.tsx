export const dynamic = "force-dynamic";

import AdminDisputeDetail from "@/modules/admin/disputes/admin-dispute-detail";

/**
 * Admin Dispute Detail Page
 * Full case view with evidence and resolution controls
 * Route: /admin/disputes/[disputeId]
 */
export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ disputeId: string }>;
}) {
  const { disputeId } = await params;

  return <AdminDisputeDetail disputeId={disputeId} />;
}
