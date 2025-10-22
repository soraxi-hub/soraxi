/**
 * Reusable email footer component
 * Used across all email templates for consistent branding
 */
export function EmailFooter({ year = new Date().getFullYear() }: { year?: number }) {
  return (
    <div
      style={{
        marginTop: "30px",
        fontSize: "12px",
        color: "#777",
        textAlign: "center",
      }}
    >
      &copy; {year} Soraxi. All rights reserved.
    </div>
  )
}
