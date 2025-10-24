import { Section, Heading } from "@react-email/components";

/**
 * Reusable email header component
 * Used across all email templates for consistent branding
 */
export function EmailHeader({ title }: { title?: string }) {
  return (
    <Section
      style={{
        backgroundColor: "#14a800",
        padding: "20px",
        textAlign: "center",
        borderRadius: "6px 6px 0 0",
        color: "white",
      }}
    >
      <Heading
        as="h1"
        style={{
          margin: 0,
          fontSize: "22px",
          fontWeight: "bold",
        }}
      >
        {title}
      </Heading>
    </Section>
  );
}
