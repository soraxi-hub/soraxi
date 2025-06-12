import { Suspense } from "react";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import Profile from "@/modules/user/components/user-profile";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

async function Page() {
  const session = await getServerSession(authOptions);

  // If not authenticated, redirect to login
  if (!session) {
    return redirect(`/sign-in`);
  }

  const userId = session.user._id;
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.users.getById.queryOptions({ id: userId })
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={`Profile`}>
        <Profile />
      </Suspense>
    </HydrationBoundary>
  );
}

export default Page;
