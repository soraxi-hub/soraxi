import type { Metadata } from "next";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Disputes",
  description: "Disputes sorted by deadline urgency, with status filters.",
};

import DisputeMonitoring from "@/modules/admin/disputes/dispute-monitoring";

export default function AdminDisputesPage() {
  return <DisputeMonitoring />;
}
