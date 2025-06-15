import { Suspense } from "react";
import SignIn from "@/modules/auth/components/sign-in";
import SignInSkeleton from "@/modules/skeletons/sign-in-skeleton";

export default function SignInPage() {
  return (
    <Suspense fallback={<SignInSkeleton />}>
      <SignIn />
    </Suspense>
  );
}
