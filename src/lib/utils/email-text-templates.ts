import { siteConfig } from "@/config/site";
import { formatNaira } from "./naira";

// Utility functions for plain text email generation
export const EmailTextTemplates = {
  /**
   * Generate plain text for admin notification
   */
  generateAdminNotificationText: (details: {
    storeName: string;
    storeOwnerName: string;
    storeEmail: string;
    businessType: string;
    storeId: string;
  }): string => {
    return `New Store Submission: ${details.storeName}

Store Details:
- Store Name: ${details.storeName}
- Store Owner: ${details.storeOwnerName}
- Owner Email: ${details.storeEmail}
- Business Type: ${details.businessType}
- Submission Date: ${new Date().toLocaleDateString()}
- Store ID: ${details.storeId}

Please review this store submission in the admin dashboard.`;
  },

  /**
   * Generate plain text for store owner confirmation
   */
  generateStoreOnboardingText: (details: {
    ownerName: string;
    storeName: string;
  }): string => {
    return `Hi ${details.ownerName},

Thank you for completing your store onboarding on ${siteConfig.name}!

Your store "${details.storeName}" has been successfully submitted for admin review.

What happens next:
- Our team will review your store details
- You'll receive an email notification once a decision is made
- In the meantime, you can update your store profile

You can view your store here: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/store

If you have any questions, please don't hesitate to contact our support team.

Best regards,
The ${siteConfig.name} Team`;
  },

  /**
   * Generate plain text for OTP verification
   */
  generateOTPVerificationText: (details: {
    userName: string;
    otpCode: string;
    expiryMinutes: number;
  }): string => {
    return `Hi ${details.userName},

Thank you for signing up for ${siteConfig.name}! To complete your registration, please verify your email address using the OTP code below.

Your verification code: ${details.otpCode}

This code will expire in ${details.expiryMinutes} minutes.

If you didn't create an account with ${siteConfig.name}, you can safely ignore this email.

Best regards,
The ${siteConfig.name} Team`;
  },

  /**
   * Generate plain text for order confirmation
   */
  generateOrderConfirmationText: (details: {
    customerName: string;
    orderId: string;
    items: Array<{ name: string; quantity: number; price: number }>;
    totalAmount: number;
    deliveryDate?: string;
  }): string => {
    const itemsText = details.items
      .map(
        (item) =>
          `${item.name} (Qty: ${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`
      )
      .join("\n");

    return `Hi ${details.customerName},

Thank you for your order! We've received it and are processing it now.

Order Details:
- Order ID: ${details.orderId}
- Order Date: ${new Date().toLocaleDateString()}
${details.deliveryDate ? `- Estimated Delivery: ${details.deliveryDate}\n` : ""}

Order Items:
${itemsText}

Total: $${details.totalAmount.toFixed(2)}

Track your order here: ${process.env.NEXT_PUBLIC_APP_URL}/orders/${details.orderId}

You'll receive updates as your order progresses through our fulfillment process.

Best regards,
The ${siteConfig.name} Team`;
  },

  /**
   * Generate plain text for admin support notification
   */
  generateAdminSupportNotificationText: (details: {
    ticketId: string;
    customerName: string;
    customerEmail: string;
    subject: string;
    message: string;
  }): string => {
    return `New Support Request - Ticket: ${details.ticketId}

Support Request Details:
- Ticket ID: ${details.ticketId}
- Customer Name: ${details.customerName}
- Customer Email: ${details.customerEmail}
- Subject: ${details.subject}
- Submission Date: ${new Date().toLocaleDateString()}
- Priority: Normal

Message:
${details.message}

Please respond to this support request promptly.`;
  },

  /**
   * Generate plain text for user support confirmation
   */
  generateUserSupportConfirmationText: (details: {
    customerName: string;
    customerEmail: string;
    subject: string;
    message: string;
    ticketId: string;
    supportEmail: string;
    siteName: string;
  }): string => {
    return `Hi ${details.customerName},

Thank you for reaching out to our support team. We have received your message and will get back to you as soon as possible.

Your Message Details:
- Ticket ID: ${details.ticketId}
- Name: ${details.customerName}
- Email: ${details.customerEmail}
- Subject: ${details.subject}

Your Message:
${details.message}

What happens next:
- Our support team will review your message
- You'll receive a response within 24-48 hours
- We'll contact you at ${details.customerEmail}

If you need immediate assistance, you can also reach us directly at ${details.supportEmail}

Best regards,
The ${details.siteName} Support Team`;
  },

  /**
   * Generate plain text for store order notification
   */
  generateStoreOrderNotificationText: (details: {
    storeName: string;
    orderId: string;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      productId: string;
    }>;
    totalAmount: number;
    customerName?: string;
    customerEmail?: string;
    deliveryAddress?: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
  }): string => {
    const itemsText = details.items
      .map(
        (item) =>
          `${item.name} (Qty: ${item.quantity}) - $${item.price.toFixed(2)} each - Subtotal: $${(item.price * item.quantity).toFixed(2)}`
      )
      .join("\n");

    let addressText = "";
    if (details.deliveryAddress) {
      addressText = `\nDelivery Address:
${details.deliveryAddress.street}
${details.deliveryAddress.city}, ${details.deliveryAddress.state} ${details.deliveryAddress.postalCode}
${details.deliveryAddress.country}\n`;
    }

    let customerInfo = "";
    if (details.customerName) {
      customerInfo = `- Customer: ${details.customerName}\n`;
    }
    if (details.customerEmail) {
      customerInfo += `- Customer Email: ${details.customerEmail}\n`;
    }

    return `Hi ${details.storeName},

Great news! You've received a new order on ${siteConfig.name}.

Order Details:
- Order ID: ${details.orderId}
- Order Date: ${new Date().toLocaleDateString()}
${customerInfo}
${addressText}
Order Items:
${itemsText}

Total: $${details.totalAmount.toFixed(2)}

Please process this order promptly and update the order status in your dashboard.

Next Steps:
- Review order details in your dashboard
- Prepare items for shipment
- Update order status when shipped
- Contact support if you have any questions

View order details: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard/orders/${details.orderId}

Best regards,
The ${siteConfig.name} Team`;
  },

  /**
   * Generate plain text for password reset
   */
  generatePasswordResetText: (details: {
    resetUrl: string;
    expiryMinutes: number;
  }): string => {
    return `You're receiving this because you requested a password reset for your ${siteConfig.name} account.

Click the link below to reset your password:
${details.resetUrl}

This link will expire in ${details.expiryMinutes} minutes.

If the button doesn't work, copy and paste this link into your browser:
${details.resetUrl}

If you didn't request this password reset, you can safely ignore this email.

Best regards,
The ${siteConfig.name} Team`;
  },

  /**
   * Generate plain text for welcome email
   */
  generateWelcomeText: (details: { userName: string }): string => {
    return `Hi ${details.userName},

Welcome to ${siteConfig.name}! We're excited to have you on board.

Your account has been successfully created. You can now:
- Browse our marketplace
- Create your store (if you're a vendor)
- Make purchases and track orders

Get started here: ${process.env.NEXT_PUBLIC_APP_URL}/dashboard

If you have any questions, feel free to reach out to our support team.

Best regards,
The ${siteConfig.name} Team`;
  },

  /**
   * Generate plain text for escrow release notification
   */
  generateEscrowReleaseText: (details: {
    storeName: string;
    orderId: string;
    subOrderId: string;
    amountReleased: number;
    newBalance: number;
    transactionId: string;
    releaseDate: Date;
  }): string => {
    return `Hi ${details.storeName},

Great news! Your escrow funds have been released and are now available in your wallet.

Transaction Details:
- Order ID: ORD-${details.orderId.substring(0, 8).toUpperCase()}
- Sub-Order ID: SUB-${details.subOrderId.substring(0, 8).toUpperCase()}
- Amount Released: ${formatNaira(details.amountReleased)}
- New Wallet Balance: ${formatNaira(details.newBalance)}
- Transaction ID: ${details.transactionId.substring(0, 8).toUpperCase()}
- Release Date: ${details.releaseDate.toLocaleDateString()}

The funds are now available in your wallet for withdrawal. You can proceed to initiate a payout request whenever you're ready.

Thank you for selling with ${siteConfig.name}!

Best regards,
The ${siteConfig.name} Team`;
  },

  /**
   * Generate OTP Text
   */
  generateOTPText: (data: { otpCode: string; userName: string }) => {
    return (
      `Hi ${data.userName},\n\n` +
      `Thank you for signing up for ${siteConfig.name}! To complete your registration, please verify your email address using the OTP code below.\n\n` +
      `Your verification code: ${data.otpCode}\n\n` +
      `This code will expire in 15 minutes.\n\n` +
      `If you didn't create an account with ${siteConfig.name}, you can safely ignore this email.\n\n` +
      `Best regards,\nThe ${siteConfig.name} Team`
    );
  },
};
