import { Suspense } from "react";
import Profile from "@/modules/user/components/user-profile";
import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "react-error-boundary";

async function Page() {
  const user = await getUserFromCookie();

  if (!user) {
    return redirect(`/sign-in`);
  }
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
}

export default Page;
