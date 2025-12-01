import { formatNaira } from "@/lib/utils/naira";
import { caller } from "@/trpc/server";
import { Card, CardContent } from "@/components/ui/card";

export default async function FundReleasesHeader() {
  // Fetch summary stats via TRPC on the server
  const stats = await caller.storeFundRelease.getStoreSummaryStats();

  return (
    <header className="space-y-4 mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-semibold">Escrow Management Summary</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pending" value={stats.pending.totalAmount} />
        <StatCard label="Ready" value={stats.ready.totalAmount} />
        <StatCard label="Released" value={stats.released.totalAmount} />
        <StatCard label="Failed" value={stats.failed.totalAmount} />
      </div>
    </header>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent>
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-2xl font-bold text-foreground">
          {formatNaira(value)}
        </p>
      </CardContent>
    </Card>
  );
}
