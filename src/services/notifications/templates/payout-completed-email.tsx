import { formatNaira } from "@/lib/utils/naira";
import { EmailContainer } from "./email-container";
import { Section, Text, Row, Column } from "@react-email/components";
import { siteConfig } from "@/config/site";

/**
 * Payment settlement email template
 * Sent to store owners when payments are settled
 */
export function PayoutCompletedEmail({
  storeName,
  settlementDate,
  flutterwaveTransferId,
  bankDetails,
  amountBreakdown,
}: {
  storeName: string;
  settlementDate: string;
  flutterwaveTransferId?: string;
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
}) {
  return (
    <EmailContainer title="Payment Settlement Notification">
      <Section>
        <Text>Hi {storeName},</Text>
        <Text>Your payment settlement has been processed successfully!</Text>

        <Section
          style={{
            marginTop: "20px",
            marginBottom: "20px",
            borderRadius: "4px",
          }}
        >
          <DetailRow
            label="Requested Amount:"
            value={formatNaira(amountBreakdown.requestedAmount)}
          />

          {amountBreakdown.processingFee > 0 && (
            <DetailRow
              label="Processing Fee:"
              value={formatNaira(amountBreakdown.processingFee)}
            />
          )}

          {amountBreakdown.debtRecoveryDeductionAmount != null &&
            amountBreakdown.debtRecoveryDeductionAmount > 0 && (
              <DetailRow
                label="Debt Recovery:"
                value={formatNaira(amountBreakdown.debtRecoveryDeductionAmount)}
              />
            )}

          <DetailRow
            label="Net Amount Transferred:"
            value={formatNaira(amountBreakdown.netAmount)}
          />

          <DetailRow label="Settlement Date:" value={settlementDate} />

          <DetailRow label="Account Name:" value={bankDetails.accountName} />

          <DetailRow
            label="Account Number:"
            value={`****${bankDetails.accountNumber.slice(-4)}`}
          />

          {flutterwaveTransferId && (
            <DetailRow label="Reference:" value={flutterwaveTransferId} />
          )}

          <DetailRow label="Status:" value="Successful" />
        </Section>

        <Text>
          The funds have been transferred to your registered bank account.
        </Text>

        <Text>
          If you have any questions about this settlement, please contact our
          support team.
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

/**
 * Reusable email detail row.
 */
function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Row style={{ marginBottom: "10px" }}>
      <Column style={{ width: "40%", fontWeight: "bold" }}>{label}</Column>
      <Column>{value}</Column>
    </Row>
  );
}
