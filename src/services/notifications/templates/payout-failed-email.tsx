import { formatNaira } from "@/lib/utils/naira";
import { EmailContainer } from "./email-container";
import { Section, Text, Row, Column } from "@react-email/components";
import { siteConfig } from "@/config/site";

/**
 * Props for the payout failed email template.
 */
type PayoutFailedEmailProps = {
  storeName: string;
  payoutReference?: string;
  bankDetails: {
    accountName: string;
    accountNumber: string;
  };
  amountBreakdown: {
    requestedAmount: number;
    processingFee: number;
    gatewayFee?: number;
    debtRecoveryDeductionAmount?: number;
    netAmount: number;
  };
};

/**
 * Payout Failed Email
 *
 * Sent when a payout transfer could not be completed by the payment provider.
 *
 * Important:
 * - The transferable amount is restored to the vendor's available balance.
 * - Debt recovery deductions (if any) are not reversed because they were
 *   successfully processed before the transfer attempt.
 */
export function PayoutFailedEmail({
  storeName,
  payoutReference,
  bankDetails,
  amountBreakdown,
}: PayoutFailedEmailProps) {
  const hasDebtRecovery =
    (amountBreakdown.debtRecoveryDeductionAmount ?? 0) > 0;

  return (
    <EmailContainer title="Payout Failed">
      <Section>
        <Text>Hi {storeName},</Text>

        <Text>We were unable to complete your payout request.</Text>

        <Text>
          The transferable portion of this payout has been returned to your
          available wallet balance.
        </Text>

        {hasDebtRecovery && (
          <Text>
            Please note that debt recovery deductions associated with this
            payout were successfully processed before the transfer attempt and
            have not been reversed. Only the transferable balance has been
            restored to your wallet.
          </Text>
        )}

        <Section
          style={{
            marginTop: "20px",
            marginBottom: "20px",
            borderRadius: "4px",
          }}
        >
          <Row style={{ marginBottom: "10px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Requested Amount:
            </Column>
            <Column>{formatNaira(amountBreakdown.requestedAmount)}</Column>
          </Row>

          {hasDebtRecovery && (
            <Row style={{ marginBottom: "10px" }}>
              <Column style={{ width: "40%", fontWeight: "bold" }}>
                Debt Recovery Deduction:
              </Column>
              <Column>
                {formatNaira(amountBreakdown.debtRecoveryDeductionAmount!)}
              </Column>
            </Row>
          )}

          <Row style={{ marginBottom: "10px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Amount Restored:
            </Column>
            <Column>{formatNaira(amountBreakdown.netAmount)}</Column>
          </Row>

          <Row style={{ marginBottom: "10px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Account Name:
            </Column>
            <Column>{bankDetails.accountName}</Column>
          </Row>

          <Row style={{ marginBottom: "10px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Account Number:
            </Column>
            <Column>****{bankDetails.accountNumber.slice(-4)}</Column>
          </Row>

          {payoutReference && (
            <Row style={{ marginBottom: "10px" }}>
              <Column style={{ width: "40%", fontWeight: "bold" }}>
                Reference:
              </Column>
              <Column>{payoutReference}</Column>
            </Row>
          )}
        </Section>

        {hasDebtRecovery && (
          <Text>
            Debt repayments already applied to this payout remain valid and were
            not affected by the transfer failure.
          </Text>
        )}

        <Text>
          Before attempting another withdrawal, please verify that your bank
          account details are correct and active.
        </Text>

        <Text>
          If the issue persists, please contact our support team for assistance.
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
