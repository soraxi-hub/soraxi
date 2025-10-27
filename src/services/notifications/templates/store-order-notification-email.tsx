import {
  Section,
  Text,
  Row,
  Column,
  Button,
  Heading,
} from "@react-email/components";
import { DeliveryType } from "@/enums";
import { currencyOperations, formatNaira } from "@/lib/utils/naira";
import { siteConfig } from "@/config/site";
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
          Great news! You’ve received a new order on {siteConfig.name}.
        </Text>

        <Section style={{ marginTop: "10px", marginBottom: "10px" }}>
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
          <Section style={{ marginBottom: "10px" }}>
            <Text>
              <strong>Delivery Details:</strong>
            </Text>

            {deliveryAddress.deliveryType === DeliveryType.Campus && (
              <Text>
                Delivery Type: Campus Delivery
                <br />
                Campus Address: {deliveryAddress.street},{" "}
                {deliveryAddress.postalCode}
              </Text>
            )}

            {deliveryAddress.deliveryType === DeliveryType.OffCampus && (
              <Text>
                Delivery Type: Off-campus Delivery
                <br />
                Address: {deliveryAddress.street}
                <br />
                Country: {deliveryAddress.country}
                <br />
                Postal Code: {deliveryAddress.postalCode}
              </Text>
            )}
          </Section>
        )}

        <Heading
          as="h3"
          style={{
            marginBottom: "10px",
            fontSize: "18px",
            color: "#14a800",
          }}
        >
          Order Items
        </Heading>

        {/* Header Row */}
        <Section
          style={{
            borderTop: "2px solid #14a800",
            borderBottom: "1px solid #eee",
            padding: "10px 0",
            fontWeight: "bold",
          }}
        >
          <Row>
            <Column style={{ width: "40%" }}>Product</Column>
            <Column style={{ width: "20%", textAlign: "center" }}>Qty</Column>
            <Column style={{ width: "20%", textAlign: "right" }}>
              Unit Price
            </Column>
            <Column style={{ width: "20%", textAlign: "right" }}>
              Subtotal
            </Column>
          </Row>
        </Section>

        {/* Item Rows */}
        {items.map((item, index) => (
          <Section
            key={index}
            style={{ borderBottom: "1px solid #eee", padding: "8px 0" }}
          >
            <Row>
              <Column style={{ width: "40%" }}>{item.name}</Column>
              <Column style={{ width: "20%", textAlign: "center" }}>
                {item.quantity}
              </Column>
              <Column style={{ width: "20%", textAlign: "right" }}>
                {formatNaira(item.price ?? 0)}
              </Column>
              <Column style={{ width: "20%", textAlign: "right" }}>
                {formatNaira(
                  currencyOperations.multiply(item.price ?? 0, item.quantity)
                )}
              </Column>
            </Row>
          </Section>
        ))}

        <Section
          style={{
            marginTop: "10px",
            textAlign: "right",
            fontSize: "18px",
            fontWeight: "bold",
          }}
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
          <li>Review order details in your dashboard</li>
          <li>Prepare items for shipment</li>
          <li>Update order status when shipped</li>
          <li>Contact support if you have any questions</li>
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
