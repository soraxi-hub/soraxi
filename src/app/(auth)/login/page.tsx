import { Suspense } from "react";
import StoreLoginPage from "@/modules/auth/components/store-login";
import { StoreLoginSkeleton } from "@/modules/skeletons/store-login-skeleton";

export default function SignInPage() {
  return (
    <Suspense fallback={<StoreLoginSkeleton />}>
      <StoreLoginPage />
    </Suspense>
  );
}
