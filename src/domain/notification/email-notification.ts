import nodemailer, { type Transporter } from "nodemailer";
import { Notification } from "./notification";

/**
 * Email notification type definition
 */
export type EmailType =
  | "emailVerification"
  | "passwordReset"
  | "orderConfirmation"
  | "storeOrderNotification"
  | "supportNotification"
  | "storeOnboarding"
  | "paymentSettlement"
  | "promotional"
  | "noreply"
  | "admin";

/**
 * Valid from addresses for email notifications
 */
export type FromAddress =
  | "support@soraxihub.com"
  | "noreply@soraxihub.com"
  | "info@soraxihub.com"
  | "orders@soraxihub.com"
  | "admin@soraxihub.com";

/**
 * Email notification options
 */
export interface EmailNotificationOptions {
  recipient: string;
  subject: string;
  emailType: EmailType;
  fromAddress: FromAddress;
  html?: string;
  text?: string;
  userId?: string;
  transporter?: Transporter;
}

/**
 * Concrete implementation of Notification for email delivery
 *
 * Handles email sending via Nodemailer with support for:
 * - Multiple SMTP accounts (admin, noreply)
 * - HTML and plain text content
 * - Dynamic template rendering
 * - Error handling and logging
 *
 * @extends Notification
 */
export class EmailNotification extends Notification {
  private emailType: EmailType;
  private fromAddress: FromAddress;
  private html?: string;
  private text?: string;
  // private userId?: string;
  private transporter: Transporter;

  /**
   * Email account configurations for different sender types
   * @private
   */
  private static readonly emailAccounts = {
    noreply: {
      user: process.env.SORAXI_NOREPLY_EMAIL,
      pass: process.env.SORAXI_NOREPLY_APP_PASSWORD,
    },
    admin: {
      user: process.env.SORAXI_ADMIN_EMAIL,
      pass: process.env.SORAXI_ADMIN_APP_PASSWORD,
    },
  };

  /**
   * Constructor for EmailNotification
   *
   * @param options - Email notification configuration
   * @throws Error if required environment variables are missing
   */
  constructor(options: EmailNotificationOptions) {
    super(options.recipient, options.subject);

    this.emailType = options.emailType;
    this.fromAddress = options.fromAddress;
    this.html = options.html;
    this.text = options.text;
    // this.userId = options.userId;

    // Use provided transporter or create a new one
    this.transporter =
      options.transporter || this.createTransporter(options.emailType);
  }

  private static readonly allowedFromByAccount: Record<
    "noreply" | "admin",
    FromAddress[]
  > = {
    noreply: ["noreply@soraxihub.com"],
    admin: [
      "admin@soraxihub.com",
      "support@soraxihub.com",
      "info@soraxihub.com",
      "orders@soraxihub.com",
    ],
  };

  /**
   * Creates a Nodemailer transporter based on email type
   * Routes different email types to appropriate SMTP accounts
   *
   * @private
   * @param emailType - The type of email being sent
   * @returns Configured Nodemailer transporter
   * @throws Error if SMTP credentials are missing
   */
  private createTransporter(emailType: EmailType): Transporter {
    let accountType: "noreply" | "admin";

    // Route email types to appropriate accounts
    switch (emailType) {
      case "admin":
      case "supportNotification":
      case "orderConfirmation":
      case "storeOrderNotification":
        accountType = "admin";
        break;
      case "noreply":
      case "passwordReset":
      case "emailVerification":
      case "storeOnboarding":
      case "paymentSettlement":
      case "promotional":
        accountType = "noreply";
        break;
      default:
        accountType = "admin";
    }

    const account = EmailNotification.emailAccounts[accountType];

    if (!account.user || !account.pass) {
      throw new Error(
        `Missing SMTP credentials for ${accountType} account. ` +
          `Please set SORAXI_${accountType.toUpperCase()}_EMAIL and ` +
          `SORAXI_${accountType.toUpperCase()}_APP_PASSWORD environment variables.`
      );
    }

    if (
      !EmailNotification.allowedFromByAccount[accountType].includes(
        this.fromAddress
      )
    ) {
      throw new Error(
        `From address ${this.fromAddress} is not permitted for ${accountType} account`
      );
    }

    return nodemailer.createTransport({
      host: "smtp.zoho.com",
      port: 465,
      secure: true,
      auth: {
        user: account.user,
        pass: account.pass,
      },
    });
  }

  /**
   * Validates email format
   *
   * @protected
   * @returns true if email is valid
   */
  protected validateRecipient(): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(this.recipient);
  }

  /**
   * Sends the email notification
   *
   * Implements the actual email sending logic with:
   * - Recipient validation
   * - Content validation
   * - Error handling and logging
   * - Non-blocking error handling (errors don't stop critical processes)
   *
   * @returns Promise that resolves when email is sent
   * @throws Error if validation fails or sending encounters critical issues
   */
  async send(): Promise<void> {
    try {
      // Validate recipient
      if (!this.validateRecipient()) {
        throw new Error(`Invalid email recipient: ${this.recipient}`);
      }

      // Validate content
      if (!this.html && !this.text) {
        throw new Error("Email body (HTML or text) must be provided");
      }

      // Prepare mail options
      const mailOptions = {
        from: this.fromAddress,
        // If you must display a different address, prefer verified aliases or set replyTo:
        // replyTo: this.fromAddress,
        to: this.recipient,
        subject: this.subject || "Notification",
        text: this.text || undefined,
        html: this.html || undefined,
      };

      // Send email
      const response = await this.transporter.sendMail(mailOptions);

      this.log("info", `Email sent successfully to ${this.recipient}`, {
        messageId: response.messageId,
        emailType: this.emailType,
      });
    } catch (error) {
      // Log error but don't throw for non-critical notifications
      // This prevents email failures from blocking critical operations
      this.log("error", `Failed to send email to ${this.recipient}`, {
        emailType: this.emailType,
        error: error instanceof Error ? error.message : String(error),
      });

      // Re-throw only for critical email types
      const criticalTypes: EmailType[] = ["emailVerification", "passwordReset"];
      if (criticalTypes.includes(this.emailType)) {
        throw error;
      }
    }
  }
}
