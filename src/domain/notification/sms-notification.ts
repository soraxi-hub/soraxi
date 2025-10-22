import { Notification } from "./notification";

/**
 * Stub implementation for SMS notifications
 *
 * This is a placeholder for future SMS functionality.
 * Can be extended to integrate with services like Twilio, AWS SNS, etc.
 *
 * @extends Notification
 */
export class SMSNotification extends Notification {
  /**
   * Constructor for SMSNotification
   *
   * @param recipient - Phone number to send SMS to
   * @param message - SMS message content
   */
  constructor(recipient: string, message: string) {
    super(recipient, undefined, message);
  }

  /**
   * Validates phone number format
   *
   * @protected
   * @returns true if phone number is valid
   */
  protected validateRecipient(): boolean {
    // Basic phone number validation (can be enhanced)
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    return phoneRegex.test(this.recipient);
  }

  /**
   * Sends SMS notification
   *
   * @returns Promise that resolves when SMS is sent
   * @throws Error indicating SMS is not yet implemented
   */
  async send(): Promise<void> {
    this.log("warn", "SMS notifications are not yet implemented", {
      recipient: this.recipient,
    });

    throw new Error("SMS notifications are not yet implemented. Coming soon!");
  }
}
