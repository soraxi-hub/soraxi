import { QueryBoundary } from "@/components/errors/query-boundary";
import EditProfileSkeleton from "@/modules/skeletons/edit-profile-skeleton";
import EditProfile from "@/modules/user/edit-profile";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { Suspense } from "react";
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
      <QueryBoundary>
        <Suspense fallback={<EditProfileSkeleton />}>
          <EditProfile />
        </Suspense>
      </QueryBoundary>
    </HydrateClient>
  );
}

export default Page;
