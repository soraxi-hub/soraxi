import type { Metadata } from "next";
import AdminSignIn from "@/modules/admin/components/sign-in";
import SignInSkeleton from "@/modules/skeletons/sign-in-skeleton";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Admin Sign In",
  description: "Sign in to the administrator dashboard.",
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
    <Suspense fallback={<SignInSkeleton />}>
      <AdminSignIn />
    </Suspense>
  );
}

export default Page;
