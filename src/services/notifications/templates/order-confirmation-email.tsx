import {
  Text,
  Section,
  Heading,
  Row,
  Column,
  Link,
} from "@react-email/components";
import { EmailContainer } from "./email-container";
import { formatNaira } from "@/lib/utils/naira";
import { siteConfig } from "@/config/site";

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
      <Section>
        <Text>Hi {customerName},</Text>

        <Text>
          Thank you for your order! We&#39;ve received it and are processing it
          now.
        </Text>

        <Section style={{ marginTop: "20px", marginBottom: "20px" }}>
          <Text>
            <strong>Order ID:</strong> {orderId}
          </Text>
          <Text>
            <strong>Order Date:</strong> {new Date().toLocaleDateString()}
          </Text>
          {deliveryDate && (
            <Text>
              <strong>Estimated Delivery:</strong> {deliveryDate}
            </Text>
          )}
        </Section>

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

        <Section
          style={{
            borderTop: "2px solid #14a800",
            borderBottom: "1px solid #eee",
            padding: "10px 0",
          }}
        >
          <Row>
            <Column style={{ width: "60%", fontWeight: "bold" }}>
              Product
            </Column>
            <Column
              style={{ width: "20%", textAlign: "center", fontWeight: "bold" }}
            >
              Qty
            </Column>
            <Column
              style={{ width: "20%", textAlign: "right", fontWeight: "bold" }}
            >
              Price
            </Column>
          </Row>
        </Section>

        {items.map((item, index) => (
          <Section
            key={index}
            style={{
              borderBottom: "1px solid #eee",
              padding: "8px 0",
            }}
          >
            <Row>
              <Column style={{ width: "60%" }}>{item.name}</Column>
              <Column style={{ width: "20%", textAlign: "center" }}>
                {item.quantity}
              </Column>
              <Column style={{ width: "20%", textAlign: "right" }}>
                {formatNaira(item.price ?? 0)}
              </Column>
            </Row>
          </Section>
        ))}

        <Section
          style={{
            marginTop: "20px",
            textAlign: "right",
            fontSize: "18px",
            fontWeight: "bold",
          }}
        >
          Total: {formatNaira(totalAmount ?? 0)}
        </Section>

        <Link
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
        </Link>

        <Text>
          You&#39;ll receive updates as your order progresses through our
          fulfillment process.
        </Text>

        <Text>
          Best regards,
          <br />
          The {siteConfig.name} Team
        </Text>
      </Section>
    </EmailContainer>
  );
}
