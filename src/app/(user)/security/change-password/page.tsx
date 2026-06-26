import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/errors/error-fallback";
import { UserSecurityPage } from "@/modules/user/user-security-page";
import { Metadata } from "next";
import { UserSecuritySkeleton } from "@/modules/skeletons/user-security-skeleton";

export const metadata: Metadata = {
  title: "Security",
  description: "Update your login credentials",
};

export default function Page() {
  return (
    <ErrorBoundary fallback={<ErrorFallback />}>
      <Suspense fallback={<UserSecuritySkeleton />}>
        <UserSecurityPage />
      </Suspense>
    </ErrorBoundary>
  );
}
