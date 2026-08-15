// Force dynamic rendering for this page
export const dynamic = "force-dynamic";

import { Suspense } from "react";
import PaymentSuccessSkeleton from "@/modules/skeletons/payment-success-skeleton";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { PaymentStatusClient } from "@/modules/checkout/payment-status-client";

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
    index: false, // don’t index user-specific payment success pages
    follow: true,
    nocache: true,
  },
};

interface Props {
  searchParams: Promise<{
    status?: string;
    trxref?: string; // Paystack sends trxref
    reference?: string; // Paystack sends reference
    tx_ref?: string; // Flutterwave sends tx_ref
    transaction_id?: string; // Flutterwave sends transaction_id
    [key: string]: string | undefined;
  }>;
}

export default async function Page({ searchParams }: Props) {
  const params = await searchParams;

  /**
   * Every gateway echoes our own reference — the cart idempotency key — back
   * on redirect, just under a different parameter name.
   */
  const reference = params.tx_ref ?? params.reference ?? params.trxref;

  return (
    <Suspense fallback={<PaymentSuccessSkeleton />}>
      <PaymentStatusClient reference={reference} />
    </Suspense>
  );
}
