"use client";

import { PaymentStatusProps } from "../success/payment-successful";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import SoraxiLoadingState from "@/components/soraxi-loading-state";
import { ArrowRightIcon, Clock } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  CancelledStatus,
  FailedStatus,
  SessionExpiredStatus,
  UnknownStatus,
} from "../payment-status";

function PaymentFailurePage({ searchParams }: PaymentStatusProps) {
  const trpc = useTRPC();
  const { transaction_id, tx_ref, status } = searchParams;
  const withTransactionId = transaction_id && transaction_id ? true : false;
  const { data, isLoading } = useQuery(
    trpc.flutterwavePaymentVerification.verifyPayment.queryOptions({
      tx_ref,
      transaction_id,
      withTransactionId,
    })
  );

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <SoraxiLoadingState text="Verifying your transaction…" />
      </div>
    );
  }

  if (!data) {
    return <UnknownStatus />;
  }

  if (!data.ok && data.status?.toLowerCase() === "failed") {
    return <FailedStatus transaction_reference={tx_ref} />;
  }

  if (data.ok && data.status?.toLowerCase() === "cancelled") {
    return <CancelledStatus transaction_reference={tx_ref} />;
  }

  if (status?.toLowerCase() === "session_expired") {
    return <SessionExpiredStatus />;
  }

  if (data.ok && data.status?.toLowerCase() === "pending") {
    return (
      <main className="grid min-h-full place-items-center px-6 py-10 lg:px-8">
        <div className="text-center">
          <Clock className="mx-auto h-10 w-10 text-yellow-500 dark:text-yellow-400" />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-yellow-500 dark:text-yellow-400 sm:text-5xl">
            Payment Processing
          </h1>
          <h3 className="mt-8 text-2xl leading-7 text-gray-900 dark:text-gray-100">
            Your payment is being verified.
          </h3>

          <p className="mt-6 text-sm text-gray-600 dark:text-gray-400">
            This may take up to a few minutes. Please do not refresh or close
            this page.
          </p>

          <div className="mt-6 flex items-center justify-center gap-x-6">
            <Button
              size="lg"
              asChild
              className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
            >
              <Link href="/orders" className="text-sm font-semibold">
                Check order status
              </Link>
            </Button>

            <Button size="lg" asChild variant="link">
              <Link href="/support" className="text-sm font-semibold group">
                Contact support{" "}
                <ArrowRightIcon className="w-5 h-5 transform transition-transform duration-300 group-hover:translate-x-1.5" />
              </Link>
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return <UnknownStatus />;
}

export default PaymentFailurePage;
