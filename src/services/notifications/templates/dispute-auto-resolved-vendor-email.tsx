import { Section, Text, Row, Column } from "@react-email/components";
import { EmailContainer } from "./email-container";
import { siteConfig } from "@/config/site";

/**
 * Props for the DisputeAutoResolvedVendorEmail template.
 */
interface DisputeAutoResolvedVendorEmailProps {
  storeName: string;
  orderId: string;
  suborderId: string;
  amountReleased: string; // Already formatted (e.g., "₦5,000.00")
}

/**
 * Dispute Auto-Resolved — Vendor Email
 *
 * Sent to the vendor when a dispute against them is automatically resolved
 * because the platform team did not review it within the deadline. No
 * penalty is applied — this is the team's failure, not the vendor's — but
 * the account has been flagged for review.
 */
export function DisputeAutoResolvedVendorEmail({
  storeName,
  orderId,
  suborderId,
  amountReleased,
}: DisputeAutoResolvedVendorEmailProps) {
  return (
    <EmailContainer title="Dispute Auto-Resolved">
      <Section>
        <Text>Hi {storeName},</Text>

        <Text>
          A dispute involving one of your orders was not reviewed by our
          team within the resolution deadline. As a result, it has been
          automatically resolved in the customer&apos;s favour and the
          frozen funds have been released to them as a refund.
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
            <Column style={{ fontWeight: "bold" }}>{amountReleased}</Column>
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
          <strong>No penalty has been applied to your account</strong> for
          this dispute — the deadline was missed by our review team, not by
          you. Your account has been flagged for a routine review as part of
          our standard process; this is not a punitive action.
        </Text>

        <Text>
          If you believe this dispute was resolved in error, please contact
          our support team at{" "}
          <a
            href={`mailto:${process.env.SORAXI_SUPPORT_EMAIL}`}
            style={{ color: "#14a800" }}
          >
            {process.env.SORAXI_SUPPORT_EMAIL}
          </a>
          .
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
