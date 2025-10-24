import { siteConfig } from "@/config/site";
import { EmailContainer } from "./email-container";
import { Section, Text, Row, Column } from "@react-email/components";

/**
 * OTP Verification email template
 * Sent to users for email verification with OTP code
 */
export function OTPVerificationEmail({
  userName,
  otpCode,
  expiryMinutes = 15,
}: {
  userName: string;
  otpCode: string;
  expiryMinutes: number;
}) {
  return (
    <EmailContainer title="Verify Your Email">
      <Section>
        <Text>Hi {userName},</Text>

        <Text>
          Thank you for signing up for <strong>{siteConfig.name}</strong>! To
          complete your registration, please verify your email address using the
          OTP code below.
        </Text>

        <Section
          style={{
            margin: "30px 0",
            padding: "20px",
            backgroundColor: "#f8f9fa",
            borderRadius: "8px",
            textAlign: "center",
            border: "2px solid #e9ecef",
          }}
        >
          <Text
            style={{ margin: "0 0 10px 0", fontSize: "16px", color: "#666" }}
          >
            Your verification code:
          </Text>

          <Row>
            <Column
              style={{
                fontSize: "32px",
                fontWeight: "bold",
                letterSpacing: "8px",
                color: "#14a800",
                padding: "15px",
                backgroundColor: "white",
                borderRadius: "6px",
                border: "1px solid #dee2e6",
                display: "inline-block",
                minWidth: "200px",
              }}
            >
              {otpCode}
            </Column>
          </Row>

          <Text
            style={{ margin: "15px 0 0 0", fontSize: "14px", color: "#666" }}
          >
            This code will expire in <strong>{expiryMinutes} minutes</strong>.
          </Text>
        </Section>

        <Text style={{ color: "#666" }}>
          <strong>Important:</strong> For your security, please do not share
          this code with anyone. Our support team will never ask for your
          verification code.
        </Text>

        <Text>
          If you didn&#39;t create an account with {siteConfig.name}, you can
          safely ignore this email.
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
