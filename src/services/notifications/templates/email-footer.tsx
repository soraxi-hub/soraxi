import { siteConfig } from "@/config/site";
import { Section, Text } from "@react-email/components";

/**
 * Reusable email footer component
 * Used across all email templates for consistent branding
 */
export function EmailFooter({
  year = new Date().getFullYear(),
}: {
  year?: number;
}) {
  return (
    <Section
      style={{
        marginTop: "5px",
        textAlign: "center",
      }}
    >
      <Text
        style={{
          fontSize: "12px",
          color: "#777",
        }}
      >
        &copy; {year} {siteConfig.name}. All rights reserved.
      </Text>
    </Section>
  );
}
