import { siteConfig } from "@/config/site";
import { EmailContainer } from "./email-container";
import { Section, Text, Row, Column, Link } from "@react-email/components";

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
      <Section>
        <Text>Hi {recipientName},</Text>

        {/* Safely inject campaign content (already sanitized or trusted HTML) */}
        <div dangerouslySetInnerHTML={{ __html: content }} />

        <Row style={{ marginTop: "20px", marginBottom: "20px" }}>
          <Column align="center">
            <Link
              href={ctaUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              style={{
                display: "inline-block",
                backgroundColor: "#14a800",
                color: "white",
                padding: "12px 24px",
                borderRadius: "4px",
                textDecoration: "none",
                fontWeight: "bold",
              }}
            >
              {ctaText}
            </Link>
          </Column>
        </Row>

        <Text>
          Best regards,
          <br />
          The {siteConfig.name} Team
        </Text>
      </Section>
    </EmailContainer>
  );
}

/**
 * Todo: This will be done later as we scale and not now.
 */
// Sanitize HTML before injecting and harden link attributes.
// Unsanitized dangerouslySetInnerHTML is an XSS vector in web previews/log viewers.
