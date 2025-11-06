"use client";

import { FeedbackWrapper } from "@/components/feedback/feedback-wrapper";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import SoraxiLoadingState from "@/components/soraxi-loading-state";
import {
  CancelledStatus,
  FailedStatus,
  SessionExpiredStatus,
  SuccessStatus,
  UnknownStatus,
} from "../payment-status";

export interface PaymentStatusProps {
  searchParams: {
    status?: string;
    trxref?: string; // PayStack gateways use trxref
    tx_ref?: string; // Flutterwave gateways use trx_ref
    transaction_id?: string; // Flutterwave gateways use transaction_id
    [key: string]: string | undefined;
  };
}

export default function PaymentSuccess({ searchParams }: PaymentStatusProps) {
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

  const transaction_reference = transaction_id || tx_ref || searchParams.trxref;

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

  if (!status) {
    return <UnknownStatus />;
  }

  if (status.toLowerCase() === "cancelled") {
    return <CancelledStatus transaction_reference={transaction_reference} />;
  }

  if (status.toLowerCase() === "failed") {
    return <FailedStatus transaction_reference={transaction_reference} />;
  }

  if (status.toLowerCase() === "session_expired") {
    return <SessionExpiredStatus />;
  }

  return (
    <FeedbackWrapper page={`payment-success`} delay={3000}>
      <SuccessStatus transaction_reference={transaction_reference} />
    </FeedbackWrapper>
  );
}
