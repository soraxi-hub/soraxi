import { Card, CardContent } from "@/components/ui/card";
import { formatNaira } from "@/lib/utils/naira";
import { caller } from "@/trpc/server";

export default async function AdminFundReleasesHeader() {
  const stats = await caller.adminFundRelease.getDashboardStats();

  return (
    <div className="mx-auto max-w-7xl px-4">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">
          Admin Escrow Management
        </h1>
        <p className="text-muted-foreground">
          Oversee and manage escrow fund releases across all stores
        </p>
      </div>

      {/* Admin Dashboard Stats */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Pending"
          value={stats.totalPending ?? 0}
          color="yellow"
        />
        <StatCard label="Ready" value={stats.totalReady ?? 0} color="blue" />
        <StatCard
          label="Released"
          value={stats.totalReleased ?? 0}
          color="green"
        />
        <StatCard label="Failed" value={stats.totalFailed ?? 0} color="red" />
        <StatCard
          label="High Risk"
          value={stats.highRiskCount ?? 0}
          color="orange"
        />
        <StatCard
          label="Total Amount"
          value={formatNaira(stats.totalAmount)}
          color="slate"
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number | string;
  color: "yellow" | "blue" | "green" | "red" | "orange" | "slate";
}) {
  const bgMap = {
    yellow:
      "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700",
    blue: "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700",
    green:
      "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700",
    red: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700",
    orange:
      "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700",
    slate:
      "bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-700",
  };

  const textMap = {
    yellow: "text-yellow-700 dark:text-yellow-300",
    blue: "text-blue-700 dark:text-blue-300",
    green: "text-green-700 dark:text-green-300",
    red: "text-red-700 dark:text-red-300",
    orange: "text-orange-700 dark:text-orange-300",
    slate: "text-slate-700 dark:text-slate-300",
  };

  return (
    <Card className={`border ${bgMap[color]}`}>
      <CardContent className="pt-6">
        <p className={`text-sm font-medium ${textMap[color]}`}>{label}</p>
        <p className={`mt-2 text-2xl font-bold ${textMap[color]}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
