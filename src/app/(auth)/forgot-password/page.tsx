import { Suspense } from "react";
import ForgotPassword from "@/modules/auth/forgot-password";
import { siteConfig } from "@/config/site";
import { Metadata } from "next";
import { ForgotPasswordSkeleton } from "@/modules/skeletons/forgot-password-skeleton";

export const metadata: Metadata = {
  title: `Forgot Password | ${siteConfig.siteTitle}`,
  description: "Reset your password to regain access to your account.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

function Page() {
  return (
    <Suspense fallback={<ForgotPasswordSkeleton />}>
      <ForgotPassword />
    </Suspense>
  );
}

export default Page;
