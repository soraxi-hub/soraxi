import { siteConfig } from "@/config/site";
import { EmailContainer } from "./email-container";
import { Section, Text, Link } from "@react-email/components";

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
      <Section>
        <Text>
          Hi <strong>{userName}</strong>,
        </Text>

        <Text>
          Thank you for reaching out to our support team. We have received your
          message and will get back to you as soon as possible.
        </Text>

        <Section
          style={{
            marginTop: "20px",
            marginBottom: "20px",
            padding: "20px",
            borderRadius: "8px",
            border: "1px solid #eee",
          }}
        >
          <Text
            style={{
              marginBottom: "10px",
              fontWeight: "bold",
              color: "#14a800",
            }}
          >
            Your Message Details:
          </Text>

          <Text>
            <strong>Ticket ID:</strong> {ticketId}
          </Text>
          <Text>
            <strong>Name:</strong> {userName}
          </Text>
          <Text>
            <strong>Email:</strong> {userEmail}
          </Text>
          <Text>
            <strong>Subject:</strong> {subject}
          </Text>
          <Text>
            <strong>Message:</strong>
          </Text>
          <Section
            style={{
              padding: "15px",
              borderRadius: "6px",
              border: "1px solid #ddd",
              lineHeight: "1.6",
              backgroundColor: "white",
              color: "black",
            }}
          >
            <Text>{message}</Text>
          </Section>
        </Section>

        <Text>
          <strong>What happens next:</strong>
        </Text>
        <ul>
          <li>
            <Text>Our support team will review your message</Text>
          </li>
          <li>
            <Text>You&#39;ll receive a response within 24 hours</Text>
          </li>
          <li>
            <Text>We&#39;ll contact you at {userEmail}</Text>
          </li>
        </ul>

        <Text>
          If you need immediate assistance, you can also reach us directly at{" "}
          <Link
            href={`mailto:${process.env.SORAXI_SUPPORT_EMAIL}`}
            style={{ color: "#14a800" }}
          >
            {process.env.SORAXI_SUPPORT_EMAIL}
          </Link>
        </Text>

        <Text>
          Best regards,
          <br />
          The {siteConfig.name} Support Team
        </Text>
      </Section>
    </EmailContainer>
  );
}
