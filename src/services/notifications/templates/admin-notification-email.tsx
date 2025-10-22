import { EmailContainer } from "./email-container";

/**
 * Admin notification email template
 * Sent to admins for important events (new store submissions, order issues, etc.)
 */
export function AdminNotificationEmail({
  title,
  content,
  details,
  actionUrl,
  actionLabel = "View Details",
}: {
  title: string;
  content: string;
  details?: Record<string, string>;
  actionUrl?: string;
  actionLabel?: string;
}) {
  return (
    <EmailContainer title={title}>
      <p>{content}</p>

      {details && (
        <div
          style={{
            marginTop: "20px",
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#f5f5f5",
            borderRadius: "4px",
          }}
        >
          {Object.entries(details).map(([key, value]) => (
            <p key={key}>
              <strong>{key}:</strong> {value}
            </p>
          ))}
        </div>
      )}

      {actionUrl && (
        <a
          href={actionUrl}
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
          {actionLabel}
        </a>
      )}

      <p>
        Best regards,
        <br />
        The Soraxi System
      </p>
    </EmailContainer>
  );
}
