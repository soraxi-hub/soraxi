import { Text, Section, Link } from "@react-email/components";
import { EmailContainer } from "../email-container";
import { siteConfig } from "@/config/site";

/**
 * Store Reactivated Email Template
 * Sent to store owners when their suspended store has been reactivated
 */
export function StoreReactivatedEmail({
  storeName,
  storeId,
}: {
  storeName: string;
  storeId: string;
}) {
  return (
    <EmailContainer title="Store Reactivated">
      <Section>
        <Text>Hello {storeName},</Text>

        <Text style={{ marginTop: "16px" }}>
          Great news! Your store on {siteConfig.name} has been successfully
          reactivated and is now <strong>live again</strong>.
        </Text>

        <Section
          style={{
            margin: "24px 0",
            padding: "20px",
            backgroundColor: "#f0fdf4",
            borderRadius: "8px",
            border: "1px solid #86efac",
          }}
        >
          <Text style={{ margin: "0 0 12px 0", color: "#166534" }}>
            <strong>Your Store is Back Online</strong>
          </Text>
          <Text style={{ margin: "0", color: "#166534", fontSize: "14px" }}>
            Your store is now visible to customers and you can receive orders
            again.
          </Text>
        </Section>

        <Text style={{ marginTop: "16px" }}>
          <strong>What's Now Available:</strong>
        </Text>

        <ul
          style={{
            paddingLeft: "16px",
            marginTop: "8px",
            marginBottom: "16px",
          }}
        >
          <li>
            <Text style={{ margin: "4px 0" }}>
              Your products are visible to customers
            </Text>
          </li>
          <li>
            <Text style={{ margin: "4px 0" }}>You can receive new orders</Text>
          </li>
          <li>
            <Text style={{ margin: "4px 0" }}>
              Customers can contact your store
            </Text>
          </li>
          <li>
            <Text style={{ margin: "4px 0" }}>
              Full store functionality is restored
            </Text>
          </li>
        </ul>

        <Text style={{ marginTop: "16px" }}>
          We appreciate your cooperation in resolving the previous issues. We
          look forward to supporting your continued success on {siteConfig.name}
          .
        </Text>

        <Link
          href={`${process.env.NEXT_PUBLIC_APP_URL}/store/${storeId}/dashboard`}
          style={{
            backgroundColor: "#14a800",
            color: "#ffffff",
            fontWeight: "bold",
            padding: "12px 24px",
            borderRadius: "4px",
            textDecoration: "none",
            display: "inline-block",
            marginTop: "16px",
          }}
        >
          View Your Store Dashboard
        </Link>

        <Text style={{ marginTop: "24px", fontSize: "14px" }}>
          If you have any questions or need further assistance, please
          don&apos;t hesitate to reach out to our support team. We&apos;re here
          to help you succeed!
        </Text>

        <Text style={{ marginTop: "16px" }}>
          Best regards,
          <br />
          <strong>The {siteConfig.name} Team</strong>
        </Text>
      </Section>
    </EmailContainer>
  );
}
