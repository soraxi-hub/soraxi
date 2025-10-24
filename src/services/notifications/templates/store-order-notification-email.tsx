import { EmailContainer } from "./email-container";
import { Section, Text, Row, Column, Button } from "@react-email/components";
import { DeliveryType } from "@/enums";
import { currencyOperations, formatNaira } from "@/lib/utils/naira";
import { siteConfig } from "@/config/site";

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
  customerName: string;
  customerEmail: string;
  deliveryAddress?: {
    street: string;
    country: string;
    postalCode: string;
    deliveryType: DeliveryType;
  };
}) {
  return (
    <EmailContainer title="New Order Received">
      <Section>
        <Text>Hi {storeName},</Text>
        <Text>
          Great news! You&#39;ve received a new order on {siteConfig.name}.
        </Text>

        <Section style={{ marginTop: "20px", marginBottom: "20px" }}>
          <Text>
            <strong>Order ID:</strong> {orderId}
          </Text>
          <Text>
            <strong>Order Date:</strong> {new Date().toLocaleDateString()}
          </Text>
          {customerName && (
            <Text>
              <strong>Customer:</strong> {customerName}
            </Text>
          )}
          {customerEmail && (
            <Text>
              <strong>Customer Email:</strong> {customerEmail}
            </Text>
          )}
        </Section>

        {deliveryAddress && (
          <Section style={{ marginBottom: "20px" }}>
            <Text>
              <strong>Delivery Address:</strong>
            </Text>
            <Text>
              {deliveryAddress.deliveryType}
              <br />
              {deliveryAddress.street}, {deliveryAddress.postalCode}
              <br />
              {deliveryAddress.country}
            </Text>
          </Section>
        )}

        <Text style={{ fontWeight: "bold", marginBottom: "10px" }}>
          Order Items:
        </Text>
        {items.map((item, index) => (
          <Row
            key={index}
            style={{ borderBottom: "1px solid #eee", padding: "5px 0" }}
          >
            <Column style={{ width: "40%" }}>{item.name}</Column>
            <Column style={{ width: "20%", textAlign: "center" }}>
              {item.quantity}
            </Column>
            <Column style={{ width: "20%", textAlign: "right" }}>
              {formatNaira(item.price ?? 0)}
            </Column>
            <Column
              style={{ width: "20%", textAlign: "right", padding: "0 2px" }}
            >
              {formatNaira(
                currencyOperations.multiply(item.price ?? 0, item.quantity)
              )}
            </Column>
          </Row>
        ))}

        <Section
          style={{ marginTop: "20px", textAlign: "right", fontWeight: "bold" }}
        >
          Total: {formatNaira(totalAmount)}
        </Section>

        <Row>
          <Column align="center">
            <Button
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
            </Button>
          </Column>
        </Row>

        <Text>
          Please process this order promptly and update the order status in your
          dashboard.
        </Text>

        <Text>
          <strong>Next Steps:</strong>
        </Text>
        <ul>
          <li>
            <Text>Review order details in your dashboard</Text>
          </li>
          <li>
            <Text>Prepare items for shipment</Text>
          </li>
          <li>
            <Text>Update order status when shipped</Text>
          </li>
          <li>
            <Text>Contact support if you have any questions</Text>
          </li>
        </ul>

        <Text>
          Best regards,
          <br />
          The {siteConfig.name} Team
        </Text>
      </Section>
    </EmailContainer>
  );
}
