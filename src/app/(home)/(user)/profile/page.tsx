import { Suspense } from "react";

// import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
// import { getQueryClient, trpc } from "@/trpc/server";
import Profile from "@/modules/user/components/user-profile";
import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "react-error-boundary";

async function Page() {
  const user = await getUserFromCookie();

  // If not authenticated, redirect to login
  if (!user) {
    return redirect(`/sign-in`);
  }

  // const queryClient = getQueryClient();
  // void queryClient.prefetchQuery(
  //   trpc.users.getById.queryOptions({ id: user.id })
  // );
  prefetch(trpc.user.getById.queryOptions({ id: user.id }));

  return (
    <HydrateClient>
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <Suspense fallback={`Profile`}>
          <Profile id={user.id} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );

  // return (
  //   <HydrationBoundary state={dehydrate(queryClient)}>
  //     <Suspense fallback={`Profile`}>
  //       <Profile id={user.id} />
  //     </Suspense>
  //   </HydrationBoundary>
  // );
}

export default Page;
