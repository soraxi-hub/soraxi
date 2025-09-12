import { Suspense } from "react";
import ResetPassword from "@/modules/auth/reset-password";
import { ResetPasswordSkeleton } from "@/modules/skeletons/reset-password-skeleton";
import { siteConfig } from "@/config/site";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: `Reset Password | ${siteConfig.siteTitle}`,
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
    <Suspense fallback={<ResetPasswordSkeleton />}>
      <ResetPassword />
    </Suspense>
  );
}

export default Page;
