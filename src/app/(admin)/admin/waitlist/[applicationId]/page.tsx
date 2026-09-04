import type { Metadata } from "next";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Vendor Application Details",
  description:
    "Full vendor application view with status, documents, and review actions.",
};

import AdminWaitlistDetail from "@/modules/admin/waitlist/admin-waitlist-detail";

export default async function AdminWaitlistDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = await params;
  return <AdminWaitlistDetail applicationId={applicationId} />;
}
