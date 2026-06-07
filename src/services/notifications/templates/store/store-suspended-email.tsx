import { Text, Section, Link } from "@react-email/components";
import { EmailContainer } from "../email-container";
import { siteConfig } from "@/config/site";

/**
 * Store Suspended Email Template
 * Sent to store owners when their store has been suspended by admin
 */
export function StoreSuspendedEmail({ storeName }: { storeName: string }) {
  return (
    <EmailContainer title="Account Suspension Notice">
      <Section>
        <Text>Hello {storeName},</Text>

        <Text style={{ marginTop: "16px" }}>
          We are writing to inform you that your store on {siteConfig.name} has
          been suspended by our admin team.
        </Text>

        <Section
          style={{
            margin: "24px 0",
            padding: "20px",
            backgroundColor: "#fef3c7",
            borderRadius: "8px",
            border: "1px solid #fcd34d",
          }}
        >
          <Text style={{ margin: "0 0 12px 0", color: "#78350f" }}>
            <strong>Your Store Status: Suspended</strong>
          </Text>
          <Text style={{ margin: "0", color: "#78350f", fontSize: "14px" }}>
            Your store is temporarily unavailable. You will not be able to
            receive orders until further notice.
          </Text>
        </Section>

        <Text style={{ marginTop: "16px" }}>
          <strong>What This Means:</strong>
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
              Your products are no longer visible to customers
            </Text>
          </li>
          <li>
            <Text style={{ margin: "4px 0" }}>New orders cannot be placed</Text>
          </li>
          <li>
            <Text style={{ margin: "4px 0" }}>
              Customers cannot contact your store
            </Text>
          </li>
          <li>
            <Text style={{ margin: "4px 0" }}>
              Your account remains active but temporarily inactive
            </Text>
          </li>
        </ul>

        <Text style={{ marginTop: "16px" }}>
          <strong>Next Steps:</strong>
        </Text>

        <Text style={{ marginTop: "8px" }}>
          To understand why your store was suspended and to discuss potential
          resolution, please contact our support team immediately. We&apos;re
          committed to working with you to address any concerns.
        </Text>

        <Link
          href={`${process.env.NEXT_PUBLIC_APP_URL}/support`}
          style={{
            backgroundColor: "#dc2626",
            color: "#ffffff",
            fontWeight: "bold",
            padding: "12px 24px",
            borderRadius: "4px",
            textDecoration: "none",
            display: "inline-block",
            marginTop: "16px",
          }}
        >
          Contact Support Now
        </Link>

        <Text style={{ marginTop: "24px", fontSize: "14px" }}>
          Please note that suspensions are typically temporary. Our support team
          will explain the specific reasons and steps you can take to have your
          store reactivated.
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
