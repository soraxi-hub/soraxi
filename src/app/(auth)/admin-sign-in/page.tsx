import AdminSignIn from "@/modules/admin/components/sign-in";
import SignInSkeleton from "@/modules/skeletons/sign-in-skeleton";
import Head from "next/head";
import { Suspense } from "react";

function Page() {
  return (
    <Suspense fallback={<SignInSkeleton />}>
      <Head>
        <meta name="robots" content="noindex" />
        <title>Admin Sign In</title>
      </Head>
      <AdminSignIn />
    </Suspense>
  );
}

export default Page;
