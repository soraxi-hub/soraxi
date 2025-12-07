import { Text, Section, Row, Column, Link } from "@react-email/components";
import { EmailContainer } from "./email-container";
import { siteConfig } from "@/config/site";

/**
 * Admin alert email for coupon redemption failure
 */
export function CouponRedemptionFailureEmail({
  orderId,
  customerEmail,
  couponCode,
  reason,
}: {
  orderId: string;
  customerEmail: string;
  couponCode: string;
  reason?: string;
}) {
  return (
    <EmailContainer title="System Alert: Coupon Redemption Failed">
      <Section>
        <Text>
          <strong>Coupon redemption failed for an order:</strong>
        </Text>

        <Section
          style={{
            marginTop: "20px",
            marginBottom: "20px",
            padding: "15px",
            borderRadius: "4px",
            borderLeft: "4px solid #dc3545",
          }}
        >
          <Row>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Order ID:
            </Column>
            <Column>{orderId}</Column>
          </Row>

          <Row>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Customer Email:
            </Column>
            <Column>
              <Link
                href={`mailto:${customerEmail}`}
                style={{ color: "#0d6efd" }}
              >
                {customerEmail}
              </Link>
            </Column>
          </Row>

          <Row>
            <Column style={{ width: "40%", fontWeight: "bold" }}>
              Coupon Code:
            </Column>
            <Column>{couponCode}</Column>
          </Row>

          {reason && (
            <Row>
              <Column style={{ width: "40%", fontWeight: "bold" }}>
                Error Message:
              </Column>
              <Column>{reason}</Column>
            </Row>
          )}
        </Section>

        <Text>
          Please review this issue in the{" "}
          <Link
            href={`${process.env.NEXT_PUBLIC_APP_URL}/admin/orders/${orderId}`}
            style={{ color: "#14a800", textDecoration: "underline" }}
          >
            admin dashboard
          </Link>{" "}
          and retry redemption if necessary.
        </Text>

        <Text>
          Best regards,
          <br />
          The {siteConfig.name} System
        </Text>
      </Section>
    </EmailContainer>
  );
}
