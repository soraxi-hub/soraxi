import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/errors/error-fallback";
import { StoreSecurityPage } from "@/modules/store/components/store-security-page";
import { Metadata } from "next";
import { StoreSecuritySkeleton } from "@/modules/skeletons/store-security-skeleton";

export const metadata: Metadata = {
  title: "Security",
  description: "Update your store login credentials",
};

export default async function Page(props: {
  params: Promise<{ store_id: string }>;
}) {
  const { store_id } = await props.params;
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<StoreSecuritySkeleton />}>
        <StoreSecurityPage storeId={store_id} />
      </Suspense>
    </ErrorBoundary>
  );
}
