// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import AdminFundReleaseDetail from "@/components/admin/fund-release-detail";
import { ErrorFallback } from "@/components/errors/error-fallback";
import { ErrorBoundary } from "react-error-boundary";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminFundReleaseDetailPage({
  params,
}: PageProps) {
  const { id } = await params;

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <main className="min-h-screen">
        {/* Header with back button */}
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Fund Release Details
            </h1>
            <p className="text-sm text-muted-foreground">
              Review and manage this fund release with admin actions
            </p>
          </div>
        </div>

        {/* Detail content */}
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <Suspense fallback={<DetailPageLoadingSkeleton />}>
            <AdminFundReleaseDetail fundReleaseId={id} />
          </Suspense>
        </div>
      </main>
    </ErrorBoundary>
  );
}

/**
 * Loading skeleton for detail page
 */
function DetailPageLoadingSkeleton() {
  return (
    <div className="space-y-6">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-40 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  );
}
