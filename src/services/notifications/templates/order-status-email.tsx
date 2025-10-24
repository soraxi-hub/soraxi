import { siteConfig } from "@/config/site";
import { EmailContainer } from "./email-container";
import {
  Section,
  Text,
  Row,
  Column,
  Link,
  Button,
} from "@react-email/components";

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
  trackingUrl: string;
}) {
  return (
    <EmailContainer title="Order Status Update">
      <Section>
        <Text>Hi {customerName},</Text>

        <Text>Your order has been updated!</Text>

        <Section
          style={{
            marginTop: "20px",
            marginBottom: "20px",
            padding: "15px",
            // backgroundColor: "#f5f5f5",
            borderRadius: "4px",
          }}
        >
          <Row style={{ marginBottom: "5px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Order ID:
            </Column>
            <Column>{orderId}</Column>
          </Row>

          <Row style={{ marginBottom: "5px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Sub-Order ID:
            </Column>
            <Column>{subOrderId}</Column>
          </Row>

          <Row style={{ marginBottom: "5px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>Store:</Column>
            <Column>{storeName}</Column>
          </Row>

          <Row>
            <Column
              style={{ width: "40%", fontWeight: "bold", color: "#14a800" }}
            >
              Status:
            </Column>
            <Column style={{ color: "#14a800", fontWeight: "bold" }}>
              {status}
            </Column>
          </Row>
        </Section>

        {trackingUrl && (
          <Button
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
          </Button>
        )}

        <Text>
          You can log in to your{" "}
          <Link
            href={`${process.env.NEXT_PUBLIC_APP_URL}/orders/${orderId}`}
            style={{ color: "#14a800", textDecoration: "underline" }}
          >
            account
          </Link>{" "}
          to view more details about your order.
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
