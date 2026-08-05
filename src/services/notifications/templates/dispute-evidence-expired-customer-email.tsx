import { Section, Text, Row, Column } from "@react-email/components";
import { EmailContainer } from "./email-container";
import { siteConfig } from "@/config/site";

/**
 * Props for the DisputeEvidenceExpiredCustomerEmail template.
 */
interface DisputeEvidenceExpiredCustomerEmailProps {
  customerName: string;
  orderId: string;
  suborderId: string;
}

/**
 * Dispute Evidence Expired — Customer Email
 *
 * Sent to the customer when their dispute is rejected because they did not
 * submit additional evidence within the 48-hour window after the dispute
 * was marked inconclusive.
 */
export function DisputeEvidenceExpiredCustomerEmail({
  customerName,
  orderId,
  suborderId,
}: DisputeEvidenceExpiredCustomerEmailProps) {
  return (
    <EmailContainer title="Dispute Closed — No Additional Evidence Received">
      <Section>
        <Text>Hi {customerName},</Text>

        <Text>
          Our review of your dispute found the evidence provided
          inconclusive, and we requested additional evidence from you to
          continue the review. Since no additional evidence was received
          within the 48-hour window, your dispute has been closed in favour
          of the vendor and the frozen funds have been released to them.
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
          If you still have concerns about this order, please contact our
          support team at{" "}
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
