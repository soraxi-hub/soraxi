import { Suspense } from "react";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { AccountVerification } from "@/components/account-verification";
import AccountVerificationSkeleton from "@/modules/skeletons/account-verification";

export const metadata: Metadata = {
  title: `Account Verification | ${siteConfig.siteTitle}`,
  description:
    "Verify your account to access all features and ensure the security of your profile.",
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
};

export default function VerificationPage() {
  return (
    <Suspense fallback={<AccountVerificationSkeleton />}>
      <AccountVerification />
    </Suspense>
  );
}
