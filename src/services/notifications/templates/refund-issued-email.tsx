import { Section, Text, Row, Column } from "@react-email/components";
import { EmailContainer } from "./email-container";
import { RefundTrigger } from "@/enums/financial.enums";
import { siteConfig } from "@/config/site";

/**
 * Props for the RefundIssuedEmail template.
 */
interface RefundIssuedEmailProps {
  customerName: string;
  amountRefunded: string; // Already formatted (e.g., "₦5,000.00")
  trigger: RefundTrigger;
  flutterwaveRefundId?: string;
}

/**
 * Maps the refund trigger to a human-readable explanation.
 */
function getTriggerMessage(trigger: RefundTrigger): string {
  switch (trigger) {
    case RefundTrigger.ORDER_CANCELLED:
      return "Your order was cancelled by the vendor.";
    case RefundTrigger.FAILED_DELIVERY:
      return "The vendor was unable to complete the delivery.";
    case RefundTrigger.DISPUTE_UPHELD:
      return "The dispute was resolved in your favour.";
    default:
      return "A refund was issued for your order.";
  }
}

/**
 * Refund Issued Email
 *
 * Sent to customers when a refund is successfully processed and confirmed.
 * The email provides the refund amount, the reason, and a reference.
 */
export function RefundIssuedEmail({
  customerName,
  amountRefunded,
  trigger,
  flutterwaveRefundId,
}: RefundIssuedEmailProps) {
  const triggerMessage = getTriggerMessage(trigger);

  return (
    <EmailContainer title="Refund Processed">
      <Section>
        <Text>Hi {customerName},</Text>

        <Text>We have processed your refund for the following amount:</Text>

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
              {amountRefunded}
            </Column>
          </Row>

          <Row style={{ marginBottom: "10px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Reason:
            </Column>
            <Column>{triggerMessage}</Column>
          </Row>

          {flutterwaveRefundId && (
            <Row>
              <Column style={{ width: "40%", fontWeight: "bold" }}>
                Refund Reference:
              </Column>
              <Column style={{ fontFamily: "monospace" }}>
                {flutterwaveRefundId}
              </Column>
            </Row>
          )}
        </Section>

        <Text>
          The refunded amount will be returned to your original payment method
          within <strong>3–15 business days</strong>, depending on your bank or
          card issuer.
        </Text>

        <Text>
          If you have any questions about this refund, please contact our
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
