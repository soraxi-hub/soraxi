import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import { UserOrders } from "@/modules/user/user-orders";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

async function Page() {
  const userId = await getUserFromCookie();

  if (!userId) return redirect(`/sign-in`);

  prefetch(trpc.order.getByUserId.queryOptions({ userId: userId.id }));
  return (
    <HydrateClient>
      <ErrorBoundary fallback={<div>Something went wrong</div>}>
        <Suspense fallback={<div>Loading...</div>}>
          <UserOrders userId={userId.id} />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}

export default Page;
