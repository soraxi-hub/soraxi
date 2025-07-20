import { Suspense } from "react";
import ResetPassword from "@/modules/auth/reset-password";

function Page() {
  return (
    <Suspense fallback={`ResetPassword`}>
      <ResetPassword />
    </Suspense>
  );
}

export default Page;
