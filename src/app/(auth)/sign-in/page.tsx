import { Suspense } from "react";
import SignIn from "@/modules/auth/components/sign-in";
import SignInSkeleton from "@/modules/skeletons/sign-in-skeleton";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Sign In | ${siteConfig.siteTitle}`,
  description:
    "Sign in to your account to manage your profile, track orders, and enjoy a personalized shopping experience.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInSkeleton />}>
      <SignIn />
    </Suspense>
  );
}
