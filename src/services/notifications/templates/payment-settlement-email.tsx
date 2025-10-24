import { formatNaira } from "@/lib/utils/naira";
import { EmailContainer } from "./email-container";
import { Section, Text, Row, Column } from "@react-email/components";
import { siteConfig } from "@/config/site";

/**
 * Payment settlement email template
 * Sent to store owners when payments are settled
 */
export function PaymentSettlementEmail({
  storeName,
  amount,
  settlementDate,
  transactionCount,
}: {
  storeName: string;
  amount: number;
  settlementDate: string;
  transactionCount: number;
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
            // backgroundColor: "#f9f9f9",
            // padding: "15px",
            borderRadius: "4px",
          }}
        >
          <Row style={{ marginBottom: "10px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Settlement Amount:
            </Column>
            <Column>{formatNaira(amount ?? 0)}</Column>
          </Row>
          <Row style={{ marginBottom: "10px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Settlement Date:
            </Column>
            <Column>{settlementDate}</Column>
          </Row>
          <Row style={{ marginBottom: "10px" }}>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Transactions Included:
            </Column>
            <Column>{transactionCount}</Column>
          </Row>
        </Section>

        <Text>
          The funds have been transferred to your registered bank account.
        </Text>

        {/* <Row>
          <Column align="center">
            <Link
              href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/payments`}
              style={{
                display: "inline-block",
                margin: "20px 0",
                padding: "12px 24px",
                backgroundColor: "#14a800",
                color: "white",
                textDecoration: "none",
                borderRadius: "4px",
                fontWeight: "bold",
              }}
            >
              View Settlement Details
            </Link>
          </Column>
        </Row> */}

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
