"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { PaymentStatus } from "@/enums";
import { FeedbackWrapper } from "@/components/feedback/feedback-wrapper";
import SoraxiLoadingState from "@/components/soraxi-loading-state";
import {
  CancelledStatus,
  ConfirmingStatus,
  FailedStatus,
  SlowConfirmationStatus,
  SuccessStatus,
  UnknownStatus,
} from "./payment-status";

/**
 * How long to wait for the webhook before asking the server to verify
 * directly. Most webhooks land in 2-5s, so this fires only for the minority.
 */
const FALLBACK_VERIFY_AFTER_MS = 12_000;

/** When to stop implying the customer should wait, and tell them the truth. */
const SLOW_CONFIRMATION_AFTER_MS = 40_000;

/** Poll cadence against our own database — not against any gateway. */
const POLL_INTERVAL_MS = 2_500;

export interface PaymentStatusClientProps {
  /**
   * Our internal reference (the cart idempotency key). Every gateway echoes
   * it back on redirect, under its own parameter name — the server page
   * normalises those before handing it here.
   */
  reference?: string;
}

export function PaymentStatusClient({ reference }: PaymentStatusClientProps) {
  const trpc = useTRPC();
  const [elapsedMs, setElapsedMs] = useState(0);
  const fallbackFired = useRef(false);

  const statusQuery = useQuery({
    ...trpc.orderStatus.getStatus.queryOptions({ reference: reference ?? "" }),
    enabled: Boolean(reference),
    // Stop polling the moment the order reaches a terminal state.
    refetchInterval: (query) =>
      query.state.data?.isSettled ? false : POLL_INTERVAL_MS,
    retry: 1,
  });

  const forceVerify = useMutation(
    trpc.orderStatus.forceVerify.mutationOptions({
      onSettled: () => {
        // Whatever the fallback found, let the poll read the current truth.
        statusQuery.refetch();
      },
    }),
  );

  const isSettled = statusQuery.data?.isSettled ?? false;

  // Tick while the payment is unconfirmed, driving the escalation ladder.
  useEffect(() => {
    if (isSettled || !reference) return;

    const startedAt = Date.now();
    const timer = setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, 1_000);

    return () => clearInterval(timer);
  }, [isSettled, reference]);

  // Fallback: ask the server to verify directly if the webhook is late.
  // Fires once — the cron backstop covers anything this misses.
  useEffect(() => {
    if (
      !reference ||
      isSettled ||
      fallbackFired.current ||
      elapsedMs < FALLBACK_VERIFY_AFTER_MS
    ) {
      return;
    }

    fallbackFired.current = true;
    forceVerify.mutate({ reference });
  }, [elapsedMs, isSettled, reference, forceVerify]);

  if (!reference) {
    return <UnknownStatus />;
  }

  // A missing or not-owned order is a real dead end; keep the honest message
  // rather than spinning forever.
  if (statusQuery.isError) {
    return <UnknownStatus />;
  }

  if (statusQuery.isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <SoraxiLoadingState text="Checking your payment…" />
      </div>
    );
  }

  switch (statusQuery.data?.paymentStatus) {
    case PaymentStatus.Paid:
      return (
        <FeedbackWrapper page="payment-success" delay={3000}>
          <SuccessStatus transaction_reference={reference} />
        </FeedbackWrapper>
      );

    case PaymentStatus.Failed:
      return <FailedStatus transaction_reference={reference} />;

    case PaymentStatus.Cancelled:
      return <CancelledStatus transaction_reference={reference} />;

    case PaymentStatus.Refunded:
      // Refunded before the page ever settled — rare, but showing "success"
      // here would be a lie.
      return <UnknownStatus />;

    default:
      // Still pending. Below the slow threshold we ask the customer to wait;
      // past it we stop implying they need to.
      return elapsedMs >= SLOW_CONFIRMATION_AFTER_MS ? (
        <SlowConfirmationStatus transaction_reference={reference} />
      ) : (
        <ConfirmingStatus transaction_reference={reference} />
      );
  }
}
