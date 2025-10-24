import { siteConfig } from "@/config/site";
import { EmailContainer } from "./email-container";
import { Text, Section, Row, Column, Link } from "@react-email/components";

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
      <Section>
        <Text>
          <strong>⚠️ An order requires attention:</strong>
        </Text>

        <Section
          style={{
            marginTop: "20px",
            marginBottom: "20px",
            padding: "15px",
            // backgroundColor: "#fff3cd",
            borderRadius: "4px",
            borderLeft: "4px solid #ffc107",
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

          <Row style={{ marginBottom: "5px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Customer Email:
            </Column>
            <Column>
              <Link
                href={`mailto:${customerEmail}`}
                style={{ color: "#0d6efd" }}
              >
                {customerEmail}
              </Link>
            </Column>
          </Row>

          <Row style={{ marginBottom: "10px" }}>
            <Column
              style={{ width: "40%", fontWeight: "bold", color: "#d9534f" }}
            >
              Status:
            </Column>
            <Column style={{ color: "#d9534f", fontWeight: "bold" }}>
              {deliveryStatus}
            </Column>
          </Row>

          {reason && (
            <Row>
              <Column style={{ width: "40%", fontWeight: "bold" }}>
                Reason:
              </Column>
              <Column>{reason}</Column>
            </Row>
          )}
        </Section>

        <Text>
          Please review this case in the{" "}
          <Link
            href={`${process.env.NEXT_PUBLIC_APP_URL}/admin/orders/${orderId}`}
            style={{ color: "#14a800", textDecoration: "underline" }}
          >
            admin dashboard
          </Link>{" "}
          for any required follow-up action (e.g., refund, seller verification,
          etc.).
        </Text>

        <Text>
          Best regards,
          <br />
          The {siteConfig.name} System
        </Text>
      </Section>
    </EmailContainer>
  );
}
