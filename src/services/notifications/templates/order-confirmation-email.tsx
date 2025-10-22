import { EmailContainer } from "./email-container";

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

/**
 * Order confirmation email template
 * Sent to customers after successful order placement
 */
export function OrderConfirmationEmail({
  customerName,
  orderId,
  items,
  totalAmount,
  deliveryDate,
}: {
  customerName: string;
  orderId: string;
  items: OrderItem[];
  totalAmount: number;
  deliveryDate?: string;
}) {
  return (
    <EmailContainer title="Order Confirmation">
      <p>Hi {customerName},</p>
      <p>
        Thank you for your order! We&#39;ve received it and are processing it
        now.
      </p>

      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <p>
          <strong>Order ID:</strong> {orderId}
        </p>
        <p>
          <strong>Order Date:</strong> {new Date().toLocaleDateString()}
        </p>
        {deliveryDate && (
          <p>
            <strong>Estimated Delivery:</strong> {deliveryDate}
          </p>
        )}
      </div>

      <h3>Order Items:</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #14a800" }}>
            <th style={{ textAlign: "left", padding: "10px" }}>Product</th>
            <th style={{ textAlign: "center", padding: "10px" }}>Qty</th>
            <th style={{ textAlign: "right", padding: "10px" }}>Price</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} style={{ borderBottom: "1px solid #eee" }}>
              <td style={{ padding: "10px" }}>{item.name}</td>
              <td style={{ textAlign: "center", padding: "10px" }}>
                {item.quantity}
              </td>
              <td style={{ textAlign: "right", padding: "10px" }}>
                ${item.price.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          marginTop: "20px",
          textAlign: "right",
          fontSize: "18px",
          fontWeight: "bold",
        }}
      >
        Total: ${totalAmount.toFixed(2)}
      </div>

      <a
        href={`${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}`}
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

      <p>
        You&#39;ll receive updates as your order progresses through our
        fulfillment process.
      </p>
      <p>
        Best regards,
        <br />
        The Soraxi Team
      </p>
    </EmailContainer>
  );
}
