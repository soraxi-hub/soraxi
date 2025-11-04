import { Suspense } from "react";
import PaymentSuccess from "@/modules/checkout/success/payment-successful";
import PaymentSuccessSkeleton from "@/modules/skeletons/payment-success-skeleton";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import PaymentFailurePage from "@/modules/checkout/failure/payment-failure";

export const metadata: Metadata = {
  title: `Payment Status`,
  description: `Your payment was successful! Thank you for shopping with ${siteConfig.name}. Your order is being processed and you’ll receive updates soon.`,
  openGraph: {
    title: `Payment Successful | ${siteConfig.siteTitle}`,
    description: `Your payment has been confirmed. ${siteConfig.name} is processing your order and will update you shortly.`,
    url: `${process.env.NEXT_PUBLIC_APP_URL}/payment-status`,
    siteName: `${siteConfig.siteTitle}`,
    images: [
      {
        url: "/og-soraxi.png",
        width: 1200,
        height: 630,
        alt: `Payment Success on ${siteConfig.name}`,
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: `Payment Successful | ${siteConfig.name}`,
    description: `Your payment was successful! ${siteConfig.name} is processing your order now.`,
    images: ["/og-soraxi.png"],
  },
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
  },
  robots: {
    index: false, // 🚫 don’t index user-specific payment success pages
    follow: true,
    nocache: true,
  },
};

// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{
    status?: string;
    trxref?: string; // PayStack gateways use trxref
    tx_ref?: string; // Flutterwave gateways use trx_ref
    transaction_id?: string; // Flutterwave gateways use transaction_id
    [key: string]: string | undefined;
  }>;
}

export default async function Page({ searchParams }: Props) {
  const statusArr = ["successful", "completed", "success"];
  const { status } = await searchParams;

  if (!status) {
    return (
      <Suspense fallback={<PaymentSuccessSkeleton />}>
        <PaymentFailurePage searchParams={await searchParams} />
      </Suspense>
    );
  }

  if (status && !statusArr.includes((status as string).toLowerCase())) {
    return (
      <Suspense fallback={<PaymentSuccessSkeleton />}>
        <PaymentFailurePage searchParams={await searchParams} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PaymentSuccessSkeleton />}>
      <PaymentSuccess searchParams={await searchParams} />
    </Suspense>
  );
}
