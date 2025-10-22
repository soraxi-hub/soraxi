import { EmailContainer } from "./email-container";

/**
 * Order status update email template
 * Sent to customers when their order status changes
 */
export function OrderStatusEmail({
  customerName,
  orderId,
  subOrderId,
  status,
  storeName,
  trackingUrl,
}: {
  customerName?: string;
  orderId: string;
  subOrderId: string;
  status: string;
  storeName: string;
  trackingUrl?: string;
}) {
  return (
    <EmailContainer title="Order Status Update">
      {customerName && <p>Hi {customerName},</p>}
      <p>Your order has been updated!</p>

      <div
        style={{
          marginTop: "20px",
          marginBottom: "20px",
          padding: "15px",
          backgroundColor: "#f5f5f5",
          borderRadius: "4px",
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
        <p
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            color: "#14a800",
            margin: "10px 0",
          }}
        >
          Status: {status}
        </p>
      </div>

      {trackingUrl && (
        <a
          href={trackingUrl}
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
          Track Order
        </a>
      )}

      <p>
        You can log in to your account to view more details about your order.
      </p>
      <p>
        Best regards,
        <br />
        The Soraxi Team
      </p>
    </EmailContainer>
  );
}
