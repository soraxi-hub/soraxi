import { EmailContainer } from "./email-container";

/**
 * Welcome email template
 * Sent to new users upon account creation
 */
export function WelcomeEmail({ userName }: { userName: string }) {
  return (
    <EmailContainer title="Welcome to Soraxi">
      <p>Hi {userName},</p>
      <p>
        Welcome to <strong>Soraxi</strong>! We&#39;re excited to have you on
        board.
      </p>
      <p>Your account has been successfully created. You can now:</p>
      <ul>
        <li>Browse our marketplace</li>
        <li>Create your store (if you&#39;re a vendor)</li>
        <li>Make purchases and track orders</li>
      </ul>
      <a
        href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard`}
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
        Get Started
      </a>
      <p>
        If you have any questions, feel free to reach out to our support team.
      </p>
      <p>
        Best regards,
        <br />
        The Soraxi Team
      </p>
    </EmailContainer>
  );
}
