import { ErrorFallback } from "@/components/errors/error-fallback";
import EditProfileSkeleton from "@/modules/skeletons/edit-profile-skeleton";
import EditProfile from "@/modules/user/edit-profile";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import type { Metadata } from "next";
import { generateUserMetadata } from "@/lib/helpers/generate-user-metadata";

export async function generateMetadata(): Promise<Metadata> {
  return generateUserMetadata(
    "Edit Profile",
    "Update your account details, change personal information, and manage profile settings to keep your account up to date."
  );
}

async function Page() {
  prefetch(trpc.wishlist.getByUserId.queryOptions());
  return (
    <HydrateClient>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<EditProfileSkeleton />}>
          <EditProfile />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}

export default Page;
