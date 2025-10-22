import { EmailContainer } from "./email-container";

/**
 * Store onboarding email template
 * Sent to new store owners after successful onboarding submission
 */
export function StoreOnboardingEmail({
  ownerName,
  storeName,
}: {
  ownerName: string;
  storeName: string;
}) {
  return (
    <EmailContainer title="Welcome to Soraxi">
      <p>Hi {ownerName},</p>
      <p>
        Thank you for completing your store onboarding on{" "}
        <strong>Soraxi</strong>!
      </p>

      <p>
        Your store <strong>{storeName}</strong> has been successfully submitted
        for admin review.
      </p>

      <p>What happens next:</p>
      <ul>
        <li>Our team will review your store details</li>
        <li>
          You&#39;ll receive an email notification once a decision is made
        </li>
        <li>In the meantime, you can update your store profile</li>
      </ul>

      <a
        href={`${process.env.NEXT_PUBLIC_APP_URL}/dashboard/store`}
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
        View Your Store
      </a>

      <p>
        If you have any questions, please don&#39;t hesitate to contact our
        support team.
      </p>
      <p>
        Best regards,
        <br />
        The Soraxi Team
      </p>
    </EmailContainer>
  );
}
