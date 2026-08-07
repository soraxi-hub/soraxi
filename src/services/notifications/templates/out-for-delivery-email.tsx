import {
  Button,
  Heading,
  Hr,
  Section,
  Text,
} from "@react-email/components";

import { siteConfig } from "@/config/site";
import { formatNaira } from "@/lib/utils/naira";
import { EmailContainer } from "./email-container";

export interface OutForDeliveryItem {
  name: string;
  quantity: number;
  price: number;
}

/**
 * Sent when a sub-order ships, carrying the customer's delivery code.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THE CODE IS EMAILED AT ALL
 * ─────────────────────────────────────────────────────────────────────────────
 * The code lives on the order page, but a student at a hostel gate with a rider
 * waiting is not reliably going to navigate there. Email is the one channel
 * that reaches them without the app — there is no SMS provider on the platform.
 *
 * ⚠️ This is the **only** template that may contain a delivery code, and it goes
 * to the customer alone. It must never be CC'd, forwarded to a vendor, or
 * reused for a vendor-facing notification: a vendor who can read the code can
 * confirm their own delivery and be paid for goods never handed over.
 */
export function OutForDeliveryEmail({
  customerName,
  storeName,
  orderReference,
  deliveryCode,
  items,
  total,
  orderId,
}: {
  customerName: string;
  storeName: string;
  orderReference: string;
  deliveryCode: string;
  items: OutForDeliveryItem[];
  total: number;
  orderId: string;
}) {
  const grouped = `${deliveryCode.slice(0, 3)} ${deliveryCode.slice(3)}`;

  return (
    <EmailContainer title="Your order is out for delivery">
      <Heading
        style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 8px" }}
      >
        Your order is out for delivery
      </Heading>

      <Text style={{ fontSize: "14px", color: "#555", margin: "0 0 20px" }}>
        Hi {customerName}, {storeName} is bringing {items.length}{" "}
        {items.length === 1 ? "item" : "items"} to you. Give the delivery person
        the code below when your items are in your hands.
      </Text>

      {/* The code. Large, spaced and split, because this gets read aloud at a
          gate rather than copied. */}
      <Section
        style={{
          border: "1px dashed #14a800",
          borderRadius: "8px",
          padding: "20px",
          textAlign: "center" as const,
          margin: "0 0 20px",
        }}
      >
        <Text
          style={{
            fontSize: "11px",
            letterSpacing: "1px",
            textTransform: "uppercase" as const,
            color: "#666",
            margin: "0 0 6px",
          }}
        >
          Your delivery code
        </Text>

        <Text
          style={{
            fontSize: "34px",
            fontWeight: 700,
            letterSpacing: "6px",
            color: "#14a800",
            margin: "0 0 10px",
          }}
        >
          {grouped}
        </Text>

        {/* Prevents the most common stall: a customer who thinks handing over
            the code waives their rights will refuse to give it. */}
        <Text
          style={{
            fontSize: "12px",
            color: "#555",
            backgroundColor: "#f6f6f6",
            borderRadius: "6px",
            padding: "10px",
            margin: 0,
          }}
        >
          Giving this code confirms you received the items. You can still report
          a problem afterwards.
        </Text>
      </Section>

      <Text style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 8px" }}>
        Order {orderReference}
      </Text>

      {items.map((item, index) => (
        <Text
          key={index}
          style={{ fontSize: "13px", color: "#555", margin: "0 0 4px" }}
        >
          {item.name} × {item.quantity} — {formatNaira(item.price)}
        </Text>
      ))}

      <Hr style={{ borderColor: "#eee", margin: "12px 0" }} />

      <Text style={{ fontSize: "13px", fontWeight: 700, margin: "0 0 20px" }}>
        Total — {formatNaira(total)}
      </Text>

      <Button
        href={`${siteConfig.url}/orders/${orderId}`}
        style={{
          backgroundColor: "#14a800",
          color: "#ffffff",
          borderRadius: "6px",
          padding: "10px 20px",
          fontSize: "14px",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        View order
      </Button>

      <Text style={{ fontSize: "12px", color: "#888", margin: "20px 0 0" }}>
        Only share this code with the person handing over your items. Never send
        it in a chat or over the phone before then.
      </Text>
    </EmailContainer>
  );
}
