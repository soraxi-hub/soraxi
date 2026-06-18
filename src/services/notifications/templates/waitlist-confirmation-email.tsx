import { siteConfig } from "@/config/site";
import { EmailContainer } from "./email-container";
import { Section, Text } from "@react-email/components";

/**
 * Waitlist confirmation email template
 * Sent to vendors after successful application submission
 */
export function WaitlistConfirmationEmail({
  businessName,
  referenceId,
}: {
  businessName: string;
  referenceId: string;
}) {
  return (
    <EmailContainer title={`Application Received - ${siteConfig.name}`}>
      <Section>
        <Text>Hello {businessName},</Text>

        <Text>
          Thank you for applying to become a vendor on{" "}
          <strong>{siteConfig.name}</strong>!
        </Text>

        <Text>
          We have successfully received your application. Your reference ID is:
        </Text>

        <Text
          style={{
            fontSize: "20px",
            fontWeight: "bold",
            backgroundColor: "#f0f0f0",
            padding: "8px 12px",
            borderRadius: "4px",
            display: "inline-block",
            fontFamily: "monospace",
          }}
        >
          {referenceId}
        </Text>

        <Text>
          Please keep this reference ID safe. You will need it to check your
          application status.
        </Text>

        <Text>
          Our team will review your application and get back to you within 3–5
          business days.
        </Text>

        <Text>
          In the meantime, you can check your application status using the
          reference ID above and your email address.
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
