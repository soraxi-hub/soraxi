import { Section, Text, Row, Column } from "@react-email/components";
import { EmailContainer } from "./email-container";
import { siteConfig } from "@/config/site";

/**
 * Props for the DisputeEvidenceExpiredVendorEmail template.
 */
interface DisputeEvidenceExpiredVendorEmailProps {
  storeName: string;
  orderId: string;
  suborderId: string;
  amountReleased: string; // Already formatted (e.g., "₦5,000.00")
}

/**
 * Dispute Evidence Expired — Vendor Email
 *
 * Sent to the vendor when a dispute against them is closed in their favour
 * because the customer did not submit additional evidence within the
 * 48-hour window. Frozen funds have been released back to their available
 * balance.
 */
export function DisputeEvidenceExpiredVendorEmail({
  storeName,
  orderId,
  suborderId,
  amountReleased,
}: DisputeEvidenceExpiredVendorEmailProps) {
  return (
    <EmailContainer title="Dispute Closed In Your Favour">
      <Section>
        <Text>Hi {storeName},</Text>

        <Text>
          A dispute involving one of your orders has been closed in your
          favour. The customer did not submit the additional evidence we
          requested within the 48-hour window, and the funds that were
          frozen during the dispute have now been released to your
          available balance.
        </Text>

        <Section
          style={{
            marginTop: "20px",
            marginBottom: "20px",
            padding: "15px",
            borderRadius: "4px",
            border: "1px solid #e9ecef",
          }}
        >
          <Row style={{ marginBottom: "10px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Amount Released:
            </Column>
            <Column
              style={{ fontSize: "20px", fontWeight: "bold", color: "#14a800" }}
            >
              {amountReleased}
            </Column>
          </Row>

          <Row style={{ marginBottom: "10px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Order ID:
            </Column>
            <Column>{orderId}</Column>
          </Row>

          <Row>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Sub-Order ID:
            </Column>
            <Column>{suborderId}</Column>
          </Row>
        </Section>

        <Text>
          You can withdraw this balance at any time from your store
          dashboard.
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
