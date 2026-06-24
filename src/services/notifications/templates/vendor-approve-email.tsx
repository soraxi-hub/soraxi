import { siteConfig } from "@/config/site";
import { EmailContainer } from "./email-container";
import { Section, Text, Link } from "@react-email/components";

/**
 * Vendor application approval email.
 *
 * Sent after an application is approved and a store has been
 * automatically created for the vendor.
 */
export function VendorApplicationApprovedEmail({
  businessName,
  loginUrl,
  email,
  temporaryPassword,
}: {
  businessName: string;
  loginUrl: string;
  email: string;
  temporaryPassword: string;
}) {
  return (
    <EmailContainer title="Your Vendor Application Has Been Approved">
      <Section>
        <Text>Hello {businessName},</Text>

        <Text>
          Congratulations! Your application to become a vendor on{" "}
          <strong>{siteConfig.name}</strong> has been approved.
        </Text>

        <Text>
          We've automatically created your vendor store and account. You can
          sign in using the credentials below and complete your store setup.
        </Text>

        <Text>
          <strong>Email:</strong> {email}
          <br />
          <strong>Temporary Password:</strong> {temporaryPassword}
        </Text>

        <Text>
          For security reasons, please change this password immediately after
          your first login.
        </Text>

        <Link
          href={loginUrl}
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
          Login to Your Store
        </Link>

        <Text>
          Before you start selling, we recommend completing your store setup by:
        </Text>

        <Text>
          • Updating your password
          <br />
          • Adding your payout account details
          <br />
          • Configuring shipping methods
          <br />
          • Completing your store profile
          <br />• Uploading your first products
        </Text>

        <Text>
          We're excited to have you as part of the {siteConfig.name} vendor
          community.
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
