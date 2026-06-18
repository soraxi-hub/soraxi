import { siteConfig } from "@/config/site";
import { EmailContainer } from "./email-container";
import { Section, Text, Link } from "@react-email/components";

/**
 * Vendor invite email template
 * Sent to vendors when their application is approved
 */
export function VendorInviteEmail({
  businessName,
  inviteUrl,
}: {
  businessName: string;
  inviteUrl: string;
}) {
  return (
    <EmailContainer title={`You're invited to join ${siteConfig.name}`}>
      <Section>
        <Text>Hello {businessName},</Text>

        <Text>
          Great news! Your application to become a vendor on{" "}
          <strong>{siteConfig.name}</strong> has been approved.
        </Text>

        <Text>
          Click the button below to complete your onboarding and start selling:
        </Text>

        <Link
          href={inviteUrl}
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
          Complete Onboarding
        </Link>

        <Text>
          This link will expire in <strong>14 days</strong>. If you need a new
          one, please contact support.
        </Text>

        <Text>We're excited to have you on board!</Text>

        <Text>
          Best regards,
          <br />
          The {siteConfig.name} Team
        </Text>
      </Section>
    </EmailContainer>
  );
}
