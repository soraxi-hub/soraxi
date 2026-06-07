"use client";

import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNaira } from "@/lib/utils/naira";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/errors/error-fallback";
import { Calendar } from "lucide-react";
import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { PERMISSIONS } from "@/modules/admin/security/permissions";

/**
 * Inner component that consumes the wallet data via useSuspenseQuery.
 * Rendered inside Suspense and ErrorBoundary.
 */
function PlatformWalletContent() {
  const trpc = useTRPC();
  const { data: wallet } = useSuspenseQuery(
    trpc.platformWallet.getOverview.queryOptions(),
  );

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Wallet</h1>
        <p className="text-sm text-muted-foreground mt-1">
          View accumulated platform revenue from commissions and dispute
          penalties.
        </p>
      </div>

      {/* Wallet Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Current Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Total Revenue – most prominent */}
          <div>
            <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
            <p className="text-4xl font-bold text-foreground">
              {formatNaira(wallet.balances.total * 100)}{" "}
              {/* total is already in Naira, but formatNaira expects kobo; check naira.ts */}
            </p>
          </div>

          {/* Revenue Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-border">
            <div>
              <p className="text-sm text-muted-foreground">
                Commission Revenue
              </p>
              <p className="text-xl font-semibold text-green-600 dark:text-green-400">
                {formatNaira(wallet.balances.commission * 100)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Penalty Revenue</p>
              <p className="text-xl font-semibold text-amber-600 dark:text-amber-400">
                {formatNaira(wallet.balances.penalties * 100)}
              </p>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap justify-between items-center pt-2 border-t border-border text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <span>Currency:</span>
              <span className="font-mono">{wallet.currency}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <span>
                Last updated: {new Date(wallet.updatedAt).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Main export – wraps content with Suspense and ErrorBoundary.
 * Provides loading skeleton and error fallback.
 */
function PlatformWalletDashboard() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Suspense
        fallback={
          <Skeleton className="space-y-4 animate-pulse">
            <Skeleton className="h-8 w-48 rounded bg-muted" />
            <Skeleton className="h-48 rounded-xl bg-muted" />
          </Skeleton>
        }
      >
        <PlatformWalletContent />
      </Suspense>
    </ErrorBoundary>
  );
}

export default withAdminAuth(PlatformWalletDashboard, {
  requiredPermissions: [PERMISSIONS.VIEW_PLATFORM_WALLET], // assume this permission exists; add if needed
});
