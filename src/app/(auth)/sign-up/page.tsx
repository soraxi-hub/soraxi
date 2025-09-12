import { Suspense } from "react";
import { siteConfig } from "@/config/site";
import { Metadata } from "next";
import { SignUp } from "@/modules/auth/components/sign-up";
import SignUpSkeleton from "@/modules/skeletons/signup-skeleton";

export const metadata: Metadata = {
  title: `Sign Up | ${siteConfig.siteTitle}`,
  description: "Create a new account to get started.",
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
    <Suspense fallback={<SignUpSkeleton />}>
      <SignUp />
    </Suspense>
  );
}

export default Page;
