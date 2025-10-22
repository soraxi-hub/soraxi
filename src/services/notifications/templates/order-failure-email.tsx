import { EmailContainer } from "./email-container";

/**
 * Order failure notification email template
 * Sent to admins when an order encounters issues (cancellation, failed delivery, etc.)
 */
export function OrderFailureEmail({
  deliveryStatus,
  orderId,
  subOrderId,
  storeName,
  customerEmail,
  reason,
}: {
  deliveryStatus: string;
  orderId: string;
  subOrderId: string;
  storeName: string;
  customerEmail: string;
  reason?: string;
}) {
  return (
    <EmailContainer title={`Order Alert: ${deliveryStatus}`}>
      <p>
        <strong>⚠️ An order requires attention:</strong>
      </p>

      <div
        style={{
          marginTop: "20px",
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#fff3cd",
          borderRadius: "4px",
          borderLeft: "4px solid #ffc107",
        }}
      >
        <p>
          <strong>Order ID:</strong> {orderId}
        </p>
        <p>
          <strong>Sub-Order ID:</strong> {subOrderId}
        </p>
        <p>
          <strong>Store:</strong> {storeName}
        </p>
        <p>
          <strong>Customer Email:</strong> {customerEmail}
        </p>
        <p
          style={{
            fontSize: "16px",
            fontWeight: "bold",
            color: "#d9534f",
            margin: "10px 0",
          }}
        >
          Status: {deliveryStatus}
        </p>
        {reason && (
          <p>
            <strong>Reason:</strong> {reason}
          </p>
        )}
      </div>

      <p>
        Please review this case in the admin dashboard for any required
        follow-up action (e.g., refund, seller verification, etc.).
      </p>

      <p>
        Best regards,
        <br />
        The Soraxi System
      </p>
    </EmailContainer>
  );
}
