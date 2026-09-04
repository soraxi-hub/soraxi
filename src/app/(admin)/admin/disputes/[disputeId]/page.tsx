import type { Metadata } from "next";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dispute Details",
  description:
    "Case evidence, timeline, and resolution controls for a single dispute.",
};

import AdminDisputeDetail from "@/modules/admin/disputes/admin-dispute-detail";

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ disputeId: string }>;
}) {
  const { disputeId } = await params;

  return <AdminDisputeDetail disputeId={disputeId} />;
}
