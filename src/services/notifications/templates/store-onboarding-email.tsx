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
    <EmailContainer title={`Welcome to ${siteConfig.name}`}>
      <Section>
        <Text>Hi {ownerName},</Text>

        <Text>
          Thank you for completing your store onboarding on{" "}
          <strong>{siteConfig.name}</strong>!
        </Text>

        <Text>
          Your store <strong>{storeName}</strong> is now live. There is nothing
          left to wait for — you were approved when your application was
          accepted.
        </Text>

        <Text>What to do next:</Text>

        <ul>
          <li>
            <Text>Add your first products so buyers can find you</Text>
          </li>
          <li>
            <Text>
              Add your payout account so we can send you your earnings
            </Text>
          </li>
          <li>
            <Text>Share your storefront link with your customers</Text>
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
