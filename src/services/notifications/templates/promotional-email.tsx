import { EmailContainer } from "./email-container";

/**
 * Promotional email template
 * Used for marketing campaigns and special offers
 */
export function PromotionalEmail({
  recipientName,
  title,
  content,
  ctaText,
  ctaUrl,
}: {
  recipientName: string;
  title: string;
  content: string;
  ctaText: string;
  ctaUrl: string;
}) {
  return (
    <EmailContainer title={title}>
      <p>Hi {recipientName},</p>
      <div dangerouslySetInnerHTML={{ __html: content }} />

      <a
        href={ctaUrl}
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
        {ctaText}
      </a>

      <p>
        Best regards,
        <br />
        The Soraxi Team
      </p>
    </EmailContainer>
  );
}
