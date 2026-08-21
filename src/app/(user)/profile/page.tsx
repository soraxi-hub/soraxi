import { Suspense } from "react";
import Profile from "@/modules/user/components/user-profile";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { ProfileSkeleton } from "@/modules/skeletons/profile-skeleton";
import { QueryBoundary } from "@/components/errors/query-boundary";
import { Metadata } from "next";
import { siteConfig } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  const user = await getUserFromCookie();

  if (!user) {
    return {
      title: `Sign In`,
      description:
        "Sign in to your account to track orders, manage your profile, and enjoy a personalized shopping experience.",
    };
  }

  return {
    title: `${user.firstName}'s Profile`,
    description: `View and manage ${user.firstName}'s profile on ${siteConfig.name}. Track orders, update personal details, manage saved items, and enjoy a seamless shopping experience tailored to you.`,
  };
}

async function Page() {
  prefetch(trpc.user.getById.queryOptions());

  return (
    <HydrateClient>
      <QueryBoundary>
        <Suspense fallback={<ProfileSkeleton />}>
          <Profile />
        </Suspense>
      </QueryBoundary>
    </HydrateClient>
  );
}

export default Page;
