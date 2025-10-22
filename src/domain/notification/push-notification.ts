import { Notification } from "./notification";

/**
 * Stub implementation for Push notifications
 *
 * This is a placeholder for future push notification functionality.
 * Can be extended to integrate with services like Firebase Cloud Messaging, etc.
 *
 * @extends Notification
 */
export class PushNotification extends Notification {
  private title: string;

  /**
   * Constructor for PushNotification
   *
   * @param recipient - User ID or device token
   * @param title - Push notification title
   * @param message - Push notification message
   */
  constructor(recipient: string, title: string, message: string) {
    super(recipient, title, message);
    this.title = title;
  }

  /**
   * Sends push notification
   *
   * @returns Promise that resolves when push is sent
   * @throws Error indicating push notifications are not yet implemented
   */
  async send(): Promise<void> {
    this.log("warn", "Push notifications are not yet implemented", {
      recipient: this.recipient,
      title: this.title,
    });

    throw new Error("Push notifications are not yet implemented. Coming soon!");
  }
}
