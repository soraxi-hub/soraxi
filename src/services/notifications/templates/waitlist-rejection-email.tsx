import { siteConfig } from "@/config/site";
import { EmailContainer } from "./email-container";
import { Section, Text } from "@react-email/components";

/**
 * Waitlist rejection email template
 * Sent to vendors when their application is rejected
 */
export function WaitlistRejectionEmail({
  businessName,
  //   reason,
}: {
  businessName: string;
  reason: string;
}) {
  return (
    <EmailContainer
      title={`Update on your ${siteConfig.name} vendor application`}
    >
      <Section>
        <Text>Hello {businessName},</Text>

        <Text>
          Thank you for your interest in becoming a vendor on{" "}
          <strong>{siteConfig.name}</strong>.
        </Text>

        <Text>
          After careful review, we regret to inform you that your application
          has not been approved at this time.
        </Text>

        {/* {reason && (
          <>
            <Text>
              <strong>Reason provided by our team:</strong>
            </Text>
            <Text
              style={{
                padding: "12px",
                backgroundColor: "#f8f9fa",
                borderRadius: "4px",
                borderLeft: "4px solid #dc3545",
              }}
            >
              {reason}
            </Text>
          </>
        )} */}

        <Text>
          You may reapply in the future if your circumstances change. For
          further clarification, feel free to reach out to our support team.
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
