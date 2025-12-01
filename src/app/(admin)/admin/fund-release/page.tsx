// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import AdminFundReleasesList from "@/components/admin/fund-release-list";
import AdminFundReleasesHeader from "@/components/admin/fund-release-header";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/errors/error-fallback";

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

function AdminFundReleasesLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-16 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  );
}
