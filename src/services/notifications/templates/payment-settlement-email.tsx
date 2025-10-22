import { EmailContainer } from "./email-container";

/**
 * Payment settlement email template
 * Sent to store owners when payments are settled
 */
export function PaymentSettlementEmail({
  storeName,
  amount,
  settlementDate,
  transactionCount,
}: {
  storeName: string;
  amount: number;
  settlementDate: string;
  transactionCount: number;
}) {
  return (
    <EmailContainer title="Payment Settlement Notification">
      <p>Hi {storeName},</p>
      <p>Your payment settlement has been processed successfully!</p>

      <div
        style={{
          marginTop: "20px",
          marginBottom: "20px",
          backgroundColor: "#f9f9f9",
          padding: "15px",
          borderRadius: "4px",
        }}
      >
        <p>
          <strong>Settlement Amount:</strong> ${amount.toFixed(2)}
        </p>
        <p>
          <strong>Settlement Date:</strong> {settlementDate}
        </p>
        <p>
          <strong>Transactions Included:</strong> {transactionCount}
        </p>
      </div>

      <p>The funds have been transferred to your registered bank account.</p>

      <a
        href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments`}
        style={{
          display: "inline-block",
          margin: "20px 0",
          padding: "12px 24px",
          backgroundColor: "#14a800",
          color: "white",
          textDecoration: "none",
          borderRadius: "4px",
          fontWeight: "bold",
        }}
      >
        View Settlement Details
      </a>

      <p>
        If you have any questions about this settlement, please contact our
        support team.
      </p>
      <p>
        Best regards,
        <br />
        The Soraxi Team
      </p>
    </EmailContainer>
  );
}
