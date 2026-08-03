import { Section, Text, Row, Column } from "@react-email/components";
import { EmailContainer } from "./email-container";
import { siteConfig } from "@/config/site";

/**
 * Props for the DisputeAutoResolvedAdminEmail template.
 */
interface DisputeAutoResolvedAdminEmailProps {
  disputeId: string;
  orderId: string;
  suborderId: string;
  storeName: string;
  refundAmount: string; // Already formatted (e.g., "₦5,000.00")
}

/**
 * Dispute Auto-Resolved — Admin Alert Email
 *
 * Sent to the admin/platform team whenever a dispute is auto-resolved by
 * the system due to the team missing the resolution deadline. Distinct from
 * the batch failure alert — this fires for every successful auto-resolution
 * so the team is aware their SLA was missed, not just when processing fails.
 */
export function DisputeAutoResolvedAdminEmail({
  disputeId,
  orderId,
  suborderId,
  storeName,
  refundAmount,
}: DisputeAutoResolvedAdminEmailProps) {
  return (
    <EmailContainer title="System Alert: Dispute Auto-Resolved">
      <Section>
        <Text>
          <strong>
            A dispute reached its resolution deadline without action from
            the team and was auto-resolved by the system in the
            customer&apos;s favour.
          </strong>
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
          <Row style={{ marginBottom: "10px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Dispute ID:
            </Column>
            <Column>{disputeId}</Column>
          </Row>

          <Row style={{ marginBottom: "10px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Order ID:
            </Column>
            <Column>{orderId}</Column>
          </Row>

          <Row style={{ marginBottom: "10px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Sub-Order ID:
            </Column>
            <Column>{suborderId}</Column>
          </Row>

          <Row style={{ marginBottom: "10px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Store:
            </Column>
            <Column>{storeName}</Column>
          </Row>

          <Row>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Refund Amount:
            </Column>
            <Column>{refundAmount}</Column>
          </Row>
        </Section>

        <Text>
          No penalty was applied to the vendor since this was a missed
          review deadline, not vendor wrongdoing. The vendor&apos;s account
          has been flagged for routine review.
        </Text>

        <Text>
          Please review why this dispute was not actioned within the SLA to
          prevent recurrence.
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
