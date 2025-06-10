import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import { caller } from "@/trpc/server";

export default async function Home() {
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.users.getByEmail.queryOptions({ email: "mishaeljoe55@gmail.com" })
  );

  // const user = await caller.users.getByEmail({
  //   email: "mishaeljoe55@gmail.com",
  // });
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="grid items-center justify-items-center min-h-screen p-8 pb-20 gap-3 sm:p-20 font-[family-name:var(--font-geist-sans)] bg-background">
        <p>SORAXI</p>
        {/* {user && (
          <div className="text-center">
            <h1 className="text-2xl font-bold">{user.firstName}</h1>
            <p className="text-sm text-muted-foreground">ID: {user.id}</p>
          </div>
        )} */}
      </div>
    </HydrationBoundary>
  );
}
