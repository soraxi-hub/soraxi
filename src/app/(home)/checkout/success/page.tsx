import { Suspense } from "react";
import PaymentSuccess from "@/modules/checkout/success/payment-successful";
import PaymentSuccessSkeleton from "@/modules/skeletons/payment-success-skeleton";
import { CartProvider } from "@/modules/cart/cart-provider";
import type { Metadata } from "next";
import { siteConfig } from "@/config/site";

export const metadata: Metadata = {
  title: `Payment Successful | ${siteConfig.siteTitle}`,
  description:
    "Your payment was successful! Thank you for shopping with Soraxi. Your order is being processed and you’ll receive updates soon.",
  openGraph: {
    title: `Payment Successful | ${siteConfig.siteTitle}`,
    description:
      "Your payment has been confirmed. Soraxi is processing your order and will update you shortly.",
    url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/success`,
    siteName: `${siteConfig.siteTitle}`,
    images: [
      {
        url: "/og-soraxi.png",
        width: 1200,
        height: 630,
        alt: "Payment Success on Soraxi",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Payment Successful | Soraxi",
    description:
      "Your payment was successful! Soraxi is processing your order now.",
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
