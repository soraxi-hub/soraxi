import { Suspense } from "react";
import PaymentSuccess from "@/modules/checkout/success/payment-successful";
import PaymentSuccessSkeleton from "@/modules/skeletons/payment-success-skeleton";
import { CartProvider } from "@/modules/cart/cart-provider";

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    status?: string;
    trxref?: string;
  }>;
}

export default async function Page({ searchParams }: Props) {
  return (
    <Suspense fallback={<PaymentSuccessSkeleton />}>
      <CartProvider />
      <PaymentSuccess searchParams={await searchParams} />
    </Suspense>
  );
}
