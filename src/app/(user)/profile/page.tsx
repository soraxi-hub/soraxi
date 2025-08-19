import { Suspense } from "react";
import Profile from "@/modules/user/components/user-profile";
import { redirect } from "next/navigation";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";

import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { ErrorBoundary } from "react-error-boundary";
import { ProfileSkeleton } from "@/modules/skeletons/profile-skeleton";
import { ErrorFallback } from "@/components/error-fallback";
import { Metadata } from "next";
import { siteConfig } from "@/config/site";

export async function generateMetadata(): Promise<Metadata> {
  const user = await getUserFromCookie();

  if (!user) {
    return {
      title: `Sign In | ${siteConfig.name}`,
      description:
        "Sign in to your account to track orders, manage your profile, and enjoy a personalized shopping experience.",
    };
  }

  return {
    title: `${user.firstName}'s Profile | ${siteConfig.name}`,
    description: `View and manage ${user.firstName}'s profile on ${siteConfig.name}. Track orders, update personal details, manage saved items, and enjoy a seamless shopping experience tailored to you.`,
  };
}

async function Page() {
  const user = await getUserFromCookie();

  if (!user) {
    return redirect(`/sign-in`);
  }
  prefetch(trpc.user.getById.queryOptions());

  return (
    <HydrateClient>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Suspense fallback={<ProfileSkeleton />}>
          <Profile />
        </Suspense>
      </ErrorBoundary>
    </HydrateClient>
  );
}

export default Page;
