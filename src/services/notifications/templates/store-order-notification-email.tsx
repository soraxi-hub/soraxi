// StoreOrderNotificationEmail.tsx
import { DeliveryType } from "@/enums";
import { EmailContainer } from "./email-container";

export interface StoreOrderItem {
  name: string;
  quantity: number;
  price: number;
  productId: string;
}

/**
 * Store order notification email template
 * Sent to store owners when they receive a new order
 */
export function StoreOrderNotificationEmail({
  storeName,
  orderId,
  storeId,
  items,
  totalAmount,
  customerName,
  customerEmail,
  deliveryAddress,
}: {
  storeName: string;
  orderId: string;
  storeId: string;
  items: StoreOrderItem[];
  totalAmount: number;
  customerName?: string;
  customerEmail?: string;
  deliveryAddress?: {
    street: string;
    country: string;
    postalCode: string;
    deliveryType: DeliveryType;
  };
}) {
  return (
    <EmailContainer title="New Order Received">
      <p>Hi {storeName},</p>
      <p>Great news! You&#39;ve received a new order on Soraxi.</p>

      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <p>
          <strong>Order ID:</strong> {orderId}
        </p>
        <p>
          <strong>Order Date:</strong> {new Date().toLocaleDateString()}
        </p>
        {customerName && (
          <p>
            <strong>Customer:</strong> {customerName}
          </p>
        )}
        {customerEmail && (
          <p>
            <strong>Customer Email:</strong> {customerEmail}
          </p>
        )}
      </div>

      {deliveryAddress && (
        <div style={{ marginBottom: "20px" }}>
          <h4>Delivery Address:</h4>
          <p>
            {deliveryAddress.deliveryType}
            <br />
            {deliveryAddress.street}, {deliveryAddress.postalCode}
            <br />
            {deliveryAddress.country}
          </p>
        </div>
      )}

      <h3>Order Items:</h3>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "2px solid #14a800" }}>
            <th style={{ textAlign: "left", padding: "10px" }}>Product</th>
            <th style={{ textAlign: "center", padding: "10px" }}>Qty</th>
            <th style={{ textAlign: "right", padding: "10px" }}>Price</th>
            <th style={{ textAlign: "right", padding: "10px" }}>Subtotal</th>
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
              <td style={{ textAlign: "right", padding: "10px" }}>
                ${(item.price * item.quantity).toFixed(2)}
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
        href={`${process.env.NEXT_PUBLIC_APP_URL}/store/${storeId}/orders/${orderId}`}
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
        View Order Details
      </a>

      <p>
        Please process this order promptly and update the order status in your
        dashboard.
      </p>

      <p>
        <strong>Next Steps:</strong>
      </p>
      <ul>
        <li>Review order details in your dashboard</li>
        <li>Prepare items for shipment</li>
        <li>Update order status when shipped</li>
        <li>Contact support if you have any questions</li>
      </ul>

      <p>
        Best regards,
        <br />
        The Soraxi Team
      </p>
    </EmailContainer>
  );
}
