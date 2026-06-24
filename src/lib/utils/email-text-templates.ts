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
          `${item.name} (Qty: ${item.quantity}) - $${(item.price * item.quantity).toFixed(2)}`,
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
          `${item.name} (Qty: ${item.quantity}) - $${item.price.toFixed(2)} each - Subtotal: $${(item.price * item.quantity).toFixed(2)}`,
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

  /**
   *
   * @param userName string
   * @returns  string
   */
  generateWelcomeEmailText: (userName: string) => {
    return `
      Hi ${userName},
      
      Welcome to ${siteConfig.name}! We're excited to have you on board.
      
      Your account has been successfully created. You can now:
      - Browse our marketplace
      - Create your store (if you're a vendor)
      - Make purchases and track orders
      
      Get started by visiting your profile: ${process.env.NEXT_PUBLIC_APP_URL}/profile
      
      If you have any questions, feel free to reach out to our support team.
      
      Best regards,
      The ${siteConfig.name} Team
      `;
  },

  /**
   * Generate plain text for store approved notification
   */
  generateStoreApprovedText: ({
    storeName,
    storeId,
  }: {
    storeName: string;
    storeId: string;
  }): string => {
    return `Hi ${storeName},

Great news! Your store application has been approved and is now live on ${siteConfig.name}.

Your store is now active and ready to start selling.

Store Details:
- Store ID: STR-${storeId.substring(0, 8).toUpperCase()}
- Status: Active

You can now:
- Upload and manage your products
- Set up shipping methods
- Configure your payout account
- Start receiving customer orders

Access your store dashboard here:
${process.env.NEXT_PUBLIC_APP_URL}/store/${storeId}/dashboard

If you need any help getting started, our support team is always available to assist you.

Thank you for choosing ${siteConfig.name}!

Best regards,
The ${siteConfig.name} Team`;
  },

  /**
   * Generate plain text for store reactivated notification
   */
  generateStoreReactivatedText: ({
    storeName,
    storeId,
  }: {
    storeName: string;
    storeId: string;
  }): string => {
    return `Hi ${storeName},

Great news! Your store on ${siteConfig.name} has been successfully reactivated and is now live again.

Your store is back online and fully operational.

Store Details:
- Status: Active

What's now available:
- Your products are visible to customers
- You can receive new orders
- Customers can interact with your store
- Full store functionality has been restored

We appreciate your cooperation in resolving the previous issues and look forward to your continued success on ${siteConfig.name}.

Access your store dashboard here:
${process.env.NEXT_PUBLIC_APP_URL}/store/${storeId}/dashboard

If you need any assistance, our support team is always available to help.

Best regards,
The ${siteConfig.name} Team`;
  },

  /**
   * Generate plain text for store rejected notification
   */
  generateStoreRejectedText: ({
    storeName,
    // storeId,
  }: {
    storeName: string;
    // storeId: string;
  }): string => {
    return `Hi ${storeName},

Thank you for your interest in joining ${siteConfig.name}. Unfortunately, your store application was not approved at this time.

Application Status: Rejected
Your application does not meet our current platform requirements.

What You Can Do:
- Review your business information and documentation
- Ensure all required fields are accurately filled
- Reapply once you have addressed any concerns

Store Details:
- Status: Rejected

We believe in supporting quality businesses and would love to see you succeed on our platform. Don’t be discouraged—many successful stores had to refine their applications before being accepted.

Contact support for guidance:
${process.env.NEXT_PUBLIC_APP_URL}/support

Our support team can provide guidance on what might improve your application chances. Reach out anytime—we’re here to help.

Best regards,
The ${siteConfig.name} Team`;
  },

  /**
   * Generate plain text for store suspended notification
   */
  generateStoreSuspendedText: ({
    storeName,
    // storeId,
  }: {
    storeName: string;
    // storeId: string;
  }): string => {
    return `Hi ${storeName},

We are writing to inform you that your store on ${siteConfig.name} has been suspended by our admin team.

Your Store Status: Suspended
Your store is temporarily unavailable. You will not be able to receive orders until further notice.

What This Means:
- Your products are no longer visible to customers
- New orders cannot be placed
- Customers cannot contact your store
- Your account remains active but temporarily inactive

Store Details:
- Status: Suspended

Next Steps:
To understand why your store was suspended and to discuss potential resolution, please contact our support team immediately. We're committed to working with you to address any concerns.

Contact support here:
${process.env.NEXT_PUBLIC_APP_URL}/support

Please note that suspensions are typically temporary. Our support team will explain the specific reasons and steps you can take to have your store reactivated.

Best regards,
The ${siteConfig.name} Team`;
  },

  generateVendorInviteText(businessName: string, inviteUrl: string): string {
    return `Hello ${businessName},

Great news! Your application to become a vendor on ${siteConfig.name} has been approved.

Click the link below to complete your onboarding and start selling:
${inviteUrl}

This link will expire in 7 days. If you need a new one, please contact support.

Best regards,
The ${siteConfig.name} Team`;
  },

  generateVendorApplicationApprovedText(
    businessName: string,
    email: string,
    temporaryPassword: string,
    loginUrl: string,
  ): string {
    return `Hello ${businessName},

Congratulations! Your application to become a vendor on ${siteConfig.name} has been approved.

We've automatically created your vendor store and account.

Login Credentials

Email: ${email}
Temporary Password: ${temporaryPassword}

For security reasons, please change this password immediately after your first login.

Login here:
${loginUrl}

Before you start selling, we recommend completing your store setup by:

- Updating your password
- Adding your payout account details
- Configuring shipping methods
- Completing your store profile
- Uploading your first products

We're excited to have you as part of the ${siteConfig.name} vendor community.

Best regards,
The ${siteConfig.name} Team`;
  },

  generateWaitlistRejectionText(businessName: string, reason: string): string {
    return `Hello ${businessName},

Thank you for your interest in becoming a vendor on ${siteConfig.name}.

After careful review, we regret to inform you that your application has not been approved at this time.

Reason: ${reason}

You may reapply in the future if your circumstances change.

Best regards,
The ${siteConfig.name} Team`;
  },

  generateWaitlistConfirmationText(
    businessName: string,
    referenceId: string,
  ): string {
    return `Hello ${businessName},

Thank you for applying to become a vendor on ${siteConfig.name}!

We have successfully received your application. Your reference ID is: ${referenceId}

Please keep this reference ID safe. You will need it to check your application status.

Our team will review your application and get back to you within 5–7 business days.

In the meantime, you can check your application status using the reference ID above and your email address.

Best regards,
The ${siteConfig.name} Team`;
  },
};
