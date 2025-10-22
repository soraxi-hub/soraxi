// SupportContactEmail.tsx
import { siteConfig } from "@/config/site";
import { EmailContainer } from "./email-container";

/**
 * Support contact email template
 * Sent to users when they submit a support request
 */
export function SupportContactEmail({
  userName,
  userEmail,
  subject,
  message,
  ticketId,
}: {
  userName: string;
  userEmail: string;
  subject: string;
  message: string;
  ticketId: string;
}) {
  return (
    <EmailContainer title="We've Received Your Support Request">
      <p>
        Hi <strong>{userName}</strong>,
      </p>

      <p>
        Thank you for reaching out to our support team. We have received your
        message and will get back to you as soon as possible.
      </p>

      <div
        style={{
          marginTop: "20px",
          marginBottom: "20px",
          padding: "20px",
          backgroundColor: "#f9f9f9",
          borderRadius: "8px",
          border: "1px solid #eee",
        }}
      >
        <h4 style={{ margin: "0 0 15px 0", color: "#14a800" }}>
          Your Message Details:
        </h4>

        <div style={{ marginBottom: "10px" }}>
          <strong>Ticket ID:</strong> {ticketId}
        </div>
        <div style={{ marginBottom: "10px" }}>
          <strong>Name:</strong> {userName}
        </div>
        <div style={{ marginBottom: "10px" }}>
          <strong>Email:</strong> {userEmail}
        </div>
        <div style={{ marginBottom: "10px" }}>
          <strong>Subject:</strong> {subject}
        </div>
        <div style={{ marginBottom: "10px" }}>
          <strong>Message:</strong>
        </div>
        <div
          style={{
            background: "white",
            padding: "15px",
            borderRadius: "6px",
            border: "1px solid #ddd",
            lineHeight: "1.6",
          }}
        >
          {message}
        </div>
      </div>

      <p>
        <strong>What happens next:</strong>
      </p>
      <ul>
        <li>Our support team will review your message</li>
        <li>You&#39;ll receive a response within 24-48 hours</li>
        <li>We&#39;ll contact you at {userEmail}</li>
      </ul>

      <p>
        If you need immediate assistance, you can also reach us directly at{" "}
        <a
          href={`mailto:${process.env.SORAXI_SUPPORT_EMAIL}`}
          style={{ color: "#14a800" }}
        >
          {process.env.SORAXI_SUPPORT_EMAIL}
        </a>
      </p>

      <p>
        Best regards,
        <br />
        The {siteConfig.name} Support Team
      </p>
    </EmailContainer>
  );
}
