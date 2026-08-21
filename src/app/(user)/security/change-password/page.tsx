import { Suspense } from "react";
import { QueryBoundary } from "@/components/errors/query-boundary";
import { UserSecurityPage } from "@/modules/user/user-security-page";
import { Metadata } from "next";
import { UserSecuritySkeleton } from "@/modules/skeletons/user-security-skeleton";

export const metadata: Metadata = {
  title: "Security",
  description: "Update your login credentials",
};

export default function Page() {
  return (
    <QueryBoundary>
      <Suspense fallback={<UserSecuritySkeleton />}>
        <UserSecurityPage />
      </Suspense>
    </QueryBoundary>
  );
}
