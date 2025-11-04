import { FeedbackWrapper } from "@/components/feedback/feedback-wrapper";
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
  const status = searchParams.status;
  const transaction_reference =
    searchParams.trxref || searchParams.transaction_id || searchParams.tx_ref;

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
