import { siteConfig } from "@/config/site";
import { EmailContainer } from "./email-container";
import {
  Section,
  Text,
  Button,
  Row,
  Column,
  Link,
} from "@react-email/components";

/**
 * Password reset email template
 * Sent when user requests password reset
 */
export function PasswordResetEmail({
  resetUrl,
  expiryMinutes = 15,
}: {
  resetUrl: string;
  expiryMinutes: number;
}) {
  return (
    <EmailContainer title="Password Reset Request">
      <Section>
        <Text>
          You&#39;re receiving this because you requested a password reset for
          your <strong>{siteConfig.name}</strong> account.
        </Text>

        <Text>Click the button below to reset your password:</Text>

        <Row>
          <Column align="center">
            <Button
              href={resetUrl}
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
              Reset Password
            </Button>
          </Column>
        </Row>

        <Text>
          This link will expire in <strong>{expiryMinutes} minutes</strong>.
        </Text>

        <Text>
          If the button doesn&#39;t work, copy and paste this link into your
          browser:
        </Text>

        <Section
          style={{
            wordBreak: "break-all",
            background: "#f1f1f1",
            padding: "10px",
            borderRadius: "4px",
            display: "block",
            fontFamily: "monospace",
            fontSize: "14px",
            marginTop: "10px",
          }}
        >
          <Link
            href={resetUrl}
            style={{ color: "#14a800", textDecoration: "none" }}
          >
            {resetUrl}
          </Link>
        </Section>

        <Text>
          If you didn&#39;t request this password reset, you can safely ignore
          this email.
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
