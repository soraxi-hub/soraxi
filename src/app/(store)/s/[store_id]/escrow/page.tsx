import { Suspense } from "react";
import FundReleasesList from "@/modules/store/escrow/fund-releases-list";
import FundReleasesHeader from "@/modules/store/escrow/fund-releases-header";
import { Metadata } from "next";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/errors/error-fallback";
import { generateStoreMetadata } from "@/lib/helpers/generate-store-metadata";
import { FundReleasesLoadingSkeleton } from "@/modules/skeletons/store-fund-releases-skeleton";

export async function generateMetadata(): Promise<Metadata> {
  return generateStoreMetadata(
    "Escrow Management",
    "Monitor and manage all your store's escrow fund releases. Track pending, ready, and completed releases, view summary statistics, and ensure smooth settlement for your orders."
  );
}

async function Page(props: { params: Promise<{ store_id: string }> }) {
  const { store_id } = await props.params;

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <main className="min-h-screen">
        <FundReleasesHeader />

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <Suspense fallback={<FundReleasesLoadingSkeleton />}>
            <FundReleasesList params={{ store_id }} />
          </Suspense>
        </div>
      </main>
    </ErrorBoundary>
  );
}

export default Page;
