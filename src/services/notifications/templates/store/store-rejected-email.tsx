import { Text, Section, Link } from "@react-email/components";
import { EmailContainer } from "../email-container";
import { siteConfig } from "@/config/site";

/**
 * Store Rejected Email Template
 * Sent to store owners when their store application has been rejected
 */
export function StoreRejectedEmail({ storeName }: { storeName: string }) {
  return (
    <EmailContainer title="Store Application Status">
      <Section>
        <Text>Hello {storeName},</Text>

        <Text style={{ marginTop: "16px" }}>
          Thank you for your interest in joining {siteConfig.name}.
          Unfortunately, your store application was not approved at this time.
        </Text>

        <Section
          style={{
            margin: "24px 0",
            padding: "20px",
            backgroundColor: "#fef2f2",
            borderRadius: "8px",
            border: "1px solid #fecaca",
          }}
        >
          <Text style={{ margin: "0 0 12px 0", color: "#7f1d1d" }}>
            <strong>Application Status: Rejected</strong>
          </Text>
          <Text style={{ margin: "0", color: "#7f1d1d", fontSize: "14px" }}>
            Your application does not meet our current platform requirements.
          </Text>
        </Section>

        <Text style={{ marginTop: "16px" }}>
          <strong>What You Can Do:</strong>
        </Text>

        <ul
          style={{
            paddingLeft: "16px",
            marginTop: "8px",
            marginBottom: "16px",
          }}
        >
          <li>
            <Text style={{ margin: "4px 0" }}>
              Review your business information and documentation
            </Text>
          </li>
          <li>
            <Text style={{ margin: "4px 0" }}>
              Ensure all required fields are accurately filled
            </Text>
          </li>
          <li>
            <Text style={{ margin: "4px 0" }}>
              Reapply once you have addressed any concerns
            </Text>
          </li>
        </ul>

        <Text style={{ marginTop: "16px" }}>
          We believe in supporting quality businesses and would love to see you
          succeed on our platform. Don&apos;t be discouraged, many successful
          stores had to refine their applications before being accepted.
        </Text>

        <Link
          href={`${process.env.NEXT_PUBLIC_APP_URL}/support`}
          style={{
            backgroundColor: "#0066cc",
            color: "#ffffff",
            fontWeight: "bold",
            padding: "12px 24px",
            borderRadius: "4px",
            textDecoration: "none",
            display: "inline-block",
            marginTop: "16px",
          }}
        >
          Contact Support for Guidance
        </Link>

        <Text style={{ marginTop: "24px", fontSize: "14px" }}>
          Our support team can provide guidance on what might improve your
          application chances. Reach out anytime. we&apos;re here to help!
        </Text>

        <Text style={{ marginTop: "16px" }}>
          Best regards,
          <br />
          <strong>The {siteConfig.name} Team</strong>
        </Text>
      </Section>
    </EmailContainer>
  );
}
