import type { Metadata } from "next";
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Platform Financials",
  description:
    "Platform-wide financial metrics: revenue, commissions, and payouts.",
};

import AdminFinancialMetrics from "@/modules/admin/analytics/admin-financial-metrics";

export default function AdminFinancialMetricsPage() {
  return <AdminFinancialMetrics />;
}
