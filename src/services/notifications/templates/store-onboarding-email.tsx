import { siteConfig } from "@/config/site";
import { EmailContainer } from "./email-container";
import { Section, Text } from "@react-email/components";

/**
 * Store onboarding email template
 * Sent to new store owners after successful onboarding submission
 */
export function StoreOnboardingEmail({
  ownerName,
  storeName,
}: {
  ownerName: string;
  storeName: string;
}) {
  return (
    <EmailContainer title="Welcome to Soraxi">
      <Section>
        <Text>Hi {ownerName},</Text>

        <Text>
          Thank you for completing your store onboarding on{" "}
          <strong>{siteConfig.name}</strong>!
        </Text>

        <Text>
          Your store <strong>{storeName}</strong> has been successfully
          submitted for admin review.
        </Text>

        <Text>What happens next:</Text>

        <ul>
          <li>
            <Text>Our team will review your store details</Text>
          </li>
          <li>
            <Text>
              You&#39;ll receive an email notification once a decision is made
            </Text>
          </li>
          <li>
            <Text>In the meantime, you can update your store profile</Text>
          </li>
        </ul>

        {/* <Row>
          <Column align="center">
            <Button
              href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/store`}
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
              View Your Store
            </Button>
          </Column>
        </Row> */}

        <Text>
          If you have any questions, please don&#39;t hesitate to contact our
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
