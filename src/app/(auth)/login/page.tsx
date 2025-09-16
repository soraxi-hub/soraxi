import { Suspense } from "react";
import StoreLoginPage from "@/modules/auth/components/store-login";
import { StoreLoginSkeleton } from "@/modules/skeletons/store-login-skeleton";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Sign In`,
  description:
    "Sign in to your account to manage your store, track orders, and update your profile on the platform.",
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
    <Suspense fallback={<StoreLoginSkeleton />}>
      <StoreLoginPage />
    </Suspense>
  );
}
