export const dynamic = "force-dynamic";

import DisputeMonitoring from "@/modules/admin/disputes/dispute-monitoring";

/**
 * Admin Disputes Page
 * Dispute list sorted by deadline urgency with status filters
 * Route: /admin/disputes
 */
export default function AdminDisputesPage() {
  return <DisputeMonitoring />;
}
