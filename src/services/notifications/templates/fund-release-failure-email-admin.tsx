import { Text, Section, Row, Column, Link } from "@react-email/components";
import { EmailContainer } from "./email-container";
import { siteConfig } from "@/config/site";

/**
 * Admin alert email for fund release failure
 */
export function FundReleaseFailureEmail({
  orderId,
  subOrderId,
  storeName,
  reason,
}: {
  orderId: string;
  subOrderId: string;
  storeName: string;
  reason?: string;
}) {
  return (
    <EmailContainer title="System Alert: Fund Release Failed">
      <Section>
        <Text>
          <strong>Fund release failed for a store order:</strong>
        </Text>

        <Section
          style={{
            marginTop: "20px",
            marginBottom: "20px",
            padding: "15px",
            borderRadius: "4px",
            borderLeft: "4px solid #dc3545",
          }}
        >
          <Row>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Order ID:
            </Column>
            <Column>{orderId}</Column>
          </Row>

          <Row>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Sub-Order ID:
            </Column>
            <Column>{subOrderId}</Column>
          </Row>

          <Row>
            <Column style={{ width: "40%", fontWeight: "bold" }}>Store:</Column>
            <Column>{storeName}</Column>
          </Row>

          {reason && (
            <Row>
              <Column style={{ width: "40%", fontWeight: "bold" }}>
                Error Message:
              </Column>
              <Column>{reason}</Column>
            </Row>
          )}
        </Section>

        <Text>
          Please investigate this issue in the{" "}
          <Link
            href={`${process.env.NEXT_PUBLIC_APP_URL}/admin/orders/${orderId}`}
            style={{ color: "#14a800", textDecoration: "underline" }}
          >
            admin dashboard
          </Link>{" "}
          and retry the fund release or perform reconciliation.
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
