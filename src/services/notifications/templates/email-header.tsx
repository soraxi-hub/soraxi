/**
 * Reusable email header component
 * Used across all email templates for consistent branding
 */
export function EmailHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        backgroundColor: "#14a800",
        padding: "20px",
        textAlign: "center",
        borderRadius: "6px 6px 0 0",
        color: "white",
      }}
    >
      <h1 style={{ margin: 0, fontSize: "22px", fontWeight: "bold" }}>{title}</h1>
    </div>
  )
}
