import { EmailContainer } from "./email-container";

/**
 * Password reset email template
 * Sent when user requests password reset
 */
export function PasswordResetEmail({
  resetUrl,
  expiryMinutes = 15,
}: {
  resetUrl: string;
  expiryMinutes?: number;
}) {
  return (
    <EmailContainer title="Password Reset Request">
      <p>
        You&#39;re receiving this because you requested a password reset for
        your Soraxi account.
      </p>

      <p>Click the button below to reset your password:</p>

      <a
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
      </a>

      <p>
        This link will expire in <strong>{expiryMinutes} minutes</strong>.
      </p>

      <p>
        If the button doesn&#39;t work, copy and paste this link into your
        browser:
      </p>
      <code
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
        {resetUrl}
      </code>

      <p>
        If you didn&#39;t request this password reset, you can safely ignore
        this email.
      </p>
      <p>
        Best regards,
        <br />
        The Soraxi Team
      </p>
    </EmailContainer>
  );
}
