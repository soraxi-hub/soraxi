export const dynamic = "force-dynamic";

import AdminWaitlistDetail from "@/modules/admin/waitlist/admin-waitlist-detail";

/**
 * Admin Waitlist Detail Page
 * Full vendor application view with status, documents, and review actions
 * Route: /admin/waitlist/[applicationId]
 */
export default async function AdminWaitlistDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  return <AdminWaitlistDetail applicationId={applicationId} />;
}
