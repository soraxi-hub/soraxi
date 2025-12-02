// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import AdminFundReleaseDetail from "@/modules/admin/escrow-management/fund-release-detail";
import { ErrorFallback } from "@/components/errors/error-fallback";
import { ErrorBoundary } from "react-error-boundary";
import { DetailPageLoadingSkeleton } from "@/modules/skeletons/admin-fund-release-detail-page-skeleton";

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
              Admin Escrow Release Details
            </h1>
            <p className="text-sm text-muted-foreground">
              Track the status and details of this escrow release with admin
              actions
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
