import { Text, Section, Link } from "@react-email/components";
import { EmailContainer } from "../email-container";
import { siteConfig } from "@/config/site";

/**
 * Store Approved Email Template
 * Sent to store owners when their store application has been approved
 */
export function StoreApprovedEmail({
  storeName,
  storeId,
}: {
  storeName: string;
  storeId: string;
}) {
  return (
    <EmailContainer title="Store Approved">
      <Section>
        <Text>Hello {storeName},</Text>

        <Text style={{ marginTop: "16px" }}>
          Great news! Your store application has been approved by our admin team
          and is now <strong>active on {siteConfig.name}</strong>.
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
            <strong>Your store is now live!</strong>
          </Text>
          <Text style={{ margin: "0", color: "#166534", fontSize: "14px" }}>
            You can now start listing products, managing inventory, and
            receiving customer orders.
          </Text>
        </Section>

        <Text style={{ marginTop: "16px" }}>
          <strong>Next Steps:</strong>
        </Text>

        <ul
          style={{
            paddingLeft: "16px",
            marginTop: "8px",
            marginBottom: "16px",
          }}
        >
          <li>
            <Text style={{ margin: "4px 0" }}>Upload product images</Text>
          </li>
          <li>
            <Text style={{ margin: "4px 0" }}>Set up shipping methods</Text>
          </li>
          <li>
            <Text style={{ margin: "4px 0" }}>Configure payout accounts</Text>
          </li>
          <li>
            <Text style={{ margin: "4px 0" }}>Start receiving orders</Text>
          </li>
        </ul>

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
          Go to Your Store Dashboard
        </Link>

        <Text style={{ marginTop: "24px", fontSize: "14px" }}>
          If you have any questions or need assistance, our support team is
          always here to help. Feel free to reach out.
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
