import { Section, Text, Row, Column } from "@react-email/components";
import { EmailContainer } from "./email-container";
import { siteConfig } from "@/config/site";

/**
 * Props for the DisputeAutoResolvedCustomerEmail template.
 */
interface DisputeAutoResolvedCustomerEmailProps {
  customerName: string;
  orderId: string;
  suborderId: string;
  refundAmount: string; // Already formatted (e.g., "₦5,000.00")
}

/**
 * Dispute Auto-Resolved — Customer Email
 *
 * Sent to the customer when their dispute is automatically resolved in their
 * favour because the platform team did not act within the resolution deadline.
 */
export function DisputeAutoResolvedCustomerEmail({
  customerName,
  orderId,
  suborderId,
  refundAmount,
}: DisputeAutoResolvedCustomerEmailProps) {
  return (
    <EmailContainer title="Dispute Resolved In Your Favour">
      <Section>
        <Text>Hi {customerName},</Text>

        <Text>
          Your dispute was not resolved by our team within the review
          deadline, so it has been automatically resolved in your favour and
          a full refund has been issued.
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
              Refund Amount:
            </Column>
            <Column
              style={{ fontSize: "20px", fontWeight: "bold", color: "#14a800" }}
            >
              {refundAmount}
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
          The refunded amount will be returned to your original payment
          method within <strong>3–15 business days</strong>, depending on
          your bank or card issuer.
        </Text>

        <Text>
          We apologize for the delay in reviewing your dispute. If you have
          any questions, please contact our support team at{" "}
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
