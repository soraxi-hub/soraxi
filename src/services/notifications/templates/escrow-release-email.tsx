import { Text, Section, Heading } from "@react-email/components";
import { formatNaira } from "@/lib/utils/naira";
import { EmailContainer } from "./email-container";
import { siteConfig } from "@/config/site";

/**
 * Escrow release email template
 * Sent to store owners when their escrow funds are released
 */
export function EscrowReleaseEmail({
  storeName,
  orderId,
  // storeId,
  subOrderId,
  amountReleased,
  newBalance,
  transactionId,
  releaseDate = new Date(),
}: {
  storeName: string;
  orderId: string;
  storeId: string;
  subOrderId: string;
  amountReleased: number;
  newBalance: number;
  transactionId: string;
  releaseDate: Date;
}) {
  return (
    <EmailContainer title="Escrow Release Notification">
      <Section>
        <Text>Hi {storeName},</Text>

        <Text>
          Great news! Your escrow funds have been released and are now available
          in your wallet.
        </Text>

        <Section
          style={{
            marginTop: "20px",
            marginBottom: "20px",
            padding: "20px",
            // backgroundColor: "#f9f9f9",
            borderRadius: "8px",
            border: "1px solid #eee",
          }}
        >
          <Heading
            as="h4"
            style={{
              margin: "0 0 15px 0",
              color: "#14a800",
              fontSize: "16px",
            }}
          >
            Transaction Details:
          </Heading>

          <Text>
            <strong>Order ID:</strong> ORD-
            {orderId.substring(0, 8).toUpperCase()}
          </Text>

          <Text>
            <strong>Sub-Order ID:</strong> SUB-
            {subOrderId.substring(0, 8).toUpperCase()}
          </Text>

          <Text>
            <strong>Amount Released:</strong> {formatNaira(amountReleased)}
          </Text>

          <Text>
            <strong>New Wallet Balance:</strong> {formatNaira(newBalance)}
          </Text>

          <Text>
            <strong>Transaction ID:</strong>{" "}
            {transactionId.substring(0, 8).toUpperCase()}
          </Text>

          <Text>
            <strong>Release Date:</strong> {releaseDate.toLocaleDateString()}
          </Text>

          {/* <Hr style={{ borderColor: "#eee", margin: "15px 0" }} /> */}
        </Section>

        <Text>
          The funds are now available in your wallet for withdrawal. You can
          proceed to initiate a payout request whenever you&#39;re ready.
        </Text>

        {/* <Link
          href={`${process.env.NEXT_PUBLIC_APP_URL}/store/${storeId}/wallet`}
          style={{
            display: "inline-block",
            margin: "20px 0",
            padding: "12px 24px",
            backgroundColor: "#14a800",
            color: "#ffffff",
            textDecoration: "none",
            borderRadius: "4px",
            fontWeight: "bold",
          }}
        >
          View Wallet Balance
        </Link> */}

        <Text>Thank you for selling with {siteConfig.name}!</Text>

        <Text>
          Best regards,
          <br />
          The {siteConfig.name} Team
        </Text>
      </Section>
    </EmailContainer>
  );
}
