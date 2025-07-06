import { Suspense } from "react";
import PaymentSuccess from "@/modules/checkout/success/payment-successful";
import PaymentSuccessSkeleton from "@/modules/skeletons/payment-success-skeleton";

interface Props {
  searchParams: Promise<{
    status?: string;
    trxref?: string;
  }>;
}

export default async function Page({ searchParams }: Props) {
  return (
    <Suspense fallback={<PaymentSuccessSkeleton />}>
      <PaymentSuccess searchParams={await searchParams} />
    </Suspense>
  );
}
