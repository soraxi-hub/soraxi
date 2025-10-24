import { Text, Section, Link } from "@react-email/components";
import { EmailContainer } from "./email-container";
import { siteConfig } from "@/config/site";

/**
 * Welcome email template
 * Sent to new users upon account creation
 */
export function WelcomeEmail({ userName }: { userName: string }) {
  return (
    <EmailContainer title="Welcome to Soraxi">
      <Section>
        <Text>Hi {userName},</Text>

        <Text>
          Welcome to <strong>{siteConfig.name}</strong>! We&#39;re excited to
          have you on board.
        </Text>

        <Text>Your account has been successfully created. You can now:</Text>

        <ul
          style={{ paddingLeft: "16px", marginTop: "0", marginBottom: "16px" }}
        >
          <li>
            <Text>Browse our marketplace</Text>
          </li>
          <li>
            <Text>Create your store (if you&#39;re a vendor)</Text>
          </li>
          <li>
            <Text>Make purchases and track orders</Text>
          </li>
        </ul>

        <Link
          href={`${process.env.NEXT_PUBLIC_APP_URL}/profile`}
          style={{
            backgroundColor: "#14a800",
            color: "#ffffff",
            fontWeight: "bold",
            padding: "12px 24px",
            borderRadius: "4px",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Get Started
        </Link>

        <Text>
          If you have any questions, feel free to reach out to our support team.
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
