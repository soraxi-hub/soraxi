import type { Metadata } from "next";
import AuditTrailPage from "@/modules/admin/audit-logs";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit Logs",
  description: "Review administrator actions and platform audit trail.",
};

export default function Page() {
  return <AuditTrailPage />;
}
