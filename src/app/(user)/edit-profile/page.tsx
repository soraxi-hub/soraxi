import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import EditProfileSkeleton from "@/modules/skeletons/edit-profile-skeleton";
import EditProfile from "@/modules/user/edit-profile";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

async function Page() {
  const userId = await getUserFromCookie();

  if (!userId) return redirect(`/sign-in`);

  prefetch(trpc.wishlist.getByUserId.queryOptions());
  return (
    <HydrateClient>
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <Suspense fallback={<EditProfileSkeleton />}>
          <EditProfile />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}

export default Page;
