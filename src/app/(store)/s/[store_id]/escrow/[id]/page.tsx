import { Suspense } from "react";
import FundReleaseDetail from "@/modules/store/escrow/fund-release-detail";
import { Metadata } from "next";
import { generateStoreMetadata } from "@/lib/helpers/generate-store-metadata";
import { ErrorFallback } from "@/components/errors/error-fallback";
import { ErrorBoundary } from "react-error-boundary";

export async function generateMetadata(): Promise<Metadata> {
  return generateStoreMetadata(
    "Escrow Release Details",
    "View the full breakdown of this fund release, including settlement timeline, release rules, order context, risk checks, and all conditions that determined its release status."
  );
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function FundReleaseDetailPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <main className="min-h-screen">
        {/* Header with back button */}
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Escrow Release Details
            </h1>
            <p className="text-sm text-muted-foreground">
              Track the status and details of this escrow release
            </p>
          </div>
        </div>

        {/* Detail content */}
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <Suspense fallback={<DetailPageLoadingSkeleton />}>
            <FundReleaseDetail fundReleaseId={id} />
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
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
      ))}
    </div>
  );
}
