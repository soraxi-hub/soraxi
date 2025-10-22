import { formatNaira } from "@/lib/utils/naira";
import { EmailContainer } from "./email-container";

/**
 * Escrow release email template
 * Sent to store owners when their escrow funds are released
 */
export function EscrowReleaseEmail({
  storeName,
  orderId,
  storeId,
  subOrderId,
  amountReleased,
  newBalance,
  transactionId,
  releaseDate,
}: {
  storeName: string;
  orderId: string;
  storeId: string;
  subOrderId: string;
  amountReleased: number;
  newBalance: number;
  transactionId: string;
  releaseDate: Date;
}) {
  return (
    <EmailContainer title="Escrow Release Notification">
      <p>Hi {storeName},</p>

      <p>
        Great news! Your escrow funds have been released and are now available
        in your wallet.
      </p>

      <div
        style={{
          marginTop: "20px",
          marginBottom: "20px",
          padding: "20px",
          backgroundColor: "#f9f9f9",
          borderRadius: "8px",
          border: "1px solid #eee",
        }}
      >
        <h4 style={{ margin: "0 0 15px 0", color: "#14a800" }}>
          Transaction Details:
        </h4>

        <div style={{ marginBottom: "10px" }}>
          <strong>Order ID:</strong> ORD-{orderId.substring(0, 8).toUpperCase()}
        </div>
        <div style={{ marginBottom: "10px" }}>
          <strong>Sub-Order ID:</strong> SUB-
          {subOrderId.substring(0, 8).toUpperCase()}
        </div>
        <div style={{ marginBottom: "10px" }}>
          <strong>Amount Released:</strong> {formatNaira(amountReleased)}
        </div>
        <div style={{ marginBottom: "10px" }}>
          <strong>New Wallet Balance:</strong> {formatNaira(newBalance)}
        </div>
        <div style={{ marginBottom: "10px" }}>
          <strong>Transaction ID:</strong>{" "}
          {transactionId.substring(0, 8).toUpperCase()}
        </div>
        <div style={{ marginBottom: "10px" }}>
          <strong>Release Date:</strong> {releaseDate.toLocaleDateString()}
        </div>
      </div>

      <p>
        The funds are now available in your wallet for withdrawal. You can
        proceed to initiate a payout request whenever you&#39;re ready.
      </p>

      <a
        href={`${process.env.NEXT_PUBLIC_APP_URL}/store/${storeId}/wallet`}
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
        View Wallet Balance
      </a>

      <p>Thank you for selling with Soraxi!</p>

      <p>
        Best regards,
        <br />
        The Soraxi Team
      </p>
    </EmailContainer>
  );
}
