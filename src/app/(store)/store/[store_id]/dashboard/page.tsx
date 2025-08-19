import { Suspense } from "react";

import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, trpc } from "@/trpc/server";
import StoreDashboardPage from "@/modules/store/components/dashboard";
import { StoreDashboardSkeleton } from "@/modules/skeletons/store-dashboard-skeleton";
import { siteConfig } from "@/config/site";
import { Metadata } from "next";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";

// export async function generateMetadata(): Promise<Metadata> {
//   const store = await getStoreFromCookie();

//   if (!store) {
//     return {
//       title: `Sign In | ${siteConfig.name}`,
//       description:
//         "Sign in to your account to track orders, manage your profile, and enjoy a personalized shopping experience.",
//     };
//   }

//   return {
//     title: `${store.name} Storefront | ${siteConfig.name}`,
//     description: `Discover ${store.name}'s storefront on ${siteConfig.name}. Explore their latest products, browse exclusive deals, and shop with confidence from a trusted seller.`,
//   };
// }

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStoreFromCookie();

  if (!store) {
    return {
      title: `Sign In | ${siteConfig.name}`,
      description:
        "Sign in to your account to manage your store, track orders, and update your profile on the platform.",
    };
  }

  return {
    title: `${store.name}'s Dashboard | ${siteConfig.name}`,
    description: `Manage ${store.name}'s storefront profile on ${siteConfig.name}. Update store details, track sales, manage inventory, and oversee orders all in one place.`,
  };
}

async function Page({ params }: { params: Promise<{ store_id: string }> }) {
  const { store_id } = await params;
  const queryClient = getQueryClient();
  void queryClient.prefetchQuery(
    trpc.store.getById.queryOptions({ id: store_id })
  );

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense fallback={<StoreDashboardSkeleton />}>
        <StoreDashboardPage store_id={store_id} error="" />
      </Suspense>
    </HydrationBoundary>
  );
}

export default Page;
