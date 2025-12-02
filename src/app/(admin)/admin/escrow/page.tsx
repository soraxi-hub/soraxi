// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import AdminFundReleasesList from "@/modules/admin/escrow-management/fund-release-list";
import AdminFundReleasesHeader from "@/modules/admin/escrow-management/fund-release-header";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/errors/error-fallback";
import { AdminFundReleasesLoadingSkeleton } from "@/modules/skeletons/admin-fund-releases-skeleton";

export default async function AdminFundReleasesPage() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <main className="min-h-screen">
        <AdminFundReleasesHeader />

        <div className="mx-auto max-w-7xl px-4 py-8">
          <Suspense fallback={<AdminFundReleasesLoadingSkeleton />}>
            <AdminFundReleasesList />
          </Suspense>
        </div>
      </main>
    </ErrorBoundary>
  );
}
