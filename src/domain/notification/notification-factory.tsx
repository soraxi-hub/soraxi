import type { Notification } from "./notification";
import {
  EmailNotification,
  type EmailNotificationOptions,
} from "./email-notification";
import { SMSNotification } from "./sms-notification";
import { PushNotification } from "./push-notification";

// /**
//  * Notification type union
//  */
// export type NotificationType = "email" | "sms" | "push";

// /**
//  * Factory options for creating notifications
//  */
// export interface NotificationFactoryOptions {
//   type: NotificationType;
//   options: EmailNotificationOptions | any;
// }

export type NotificationTypeMap = {
  email: EmailNotificationOptions;
  sms: { recipient: string; message: string };
  push: { recipient: string; title: string; message: string };
};

/**
 * Factory class for creating notification instances
 *
 * Implements the Factory Pattern to provide a centralized way to create
 * different types of notifications. This makes it easy to:
 * - Add new notification types
 * - Switch implementations
 * - Maintain consistent creation logic
 *
 * @example
 * ```typescript
 * const emailNotification = NotificationFactory.create("email", {
 *   recipient: "user@example.com",
 *   subject: "Welcome!",
 *   emailType: "emailVerification",
 *   fromAddress: "noreply@soraxihub.com",
 *   html: "<p>Welcome to Soraxi!</p>",
 * });
 *
 * await emailNotification.send();
 * ```
 */
export class NotificationFactory {
  /**
   * Creates a notification instance based on type
   *
   * @static
   * @param type - The type of notification to create
   * @param options - Configuration options for the notification
   * @returns A new Notification instance
   * @throws Error if notification type is not supported
   */
  static create(type: "email", options: EmailNotificationOptions): Notification;
  static create(
    type: "sms",
    options: { recipient: string; message: string }
  ): Notification;
  static create(
    type: "push",
    options: { recipient: string; title: string; message: string }
  ): Notification;
  static create<T extends keyof NotificationTypeMap>(
    type: T,
    options: NotificationTypeMap[T]
  ): Notification {
    switch (type) {
      case "email":
        return new EmailNotification(options as EmailNotificationOptions);

      case "sms": {
        const smsOptions = options as { recipient: string; message: string };
        return new SMSNotification(smsOptions.recipient, smsOptions.message);
      }

      case "push": {
        const pushOptions = options as {
          recipient: string;
          title: string;
          message: string;
        };
        return new PushNotification(
          pushOptions.recipient,
          pushOptions.title,
          pushOptions.message
        );
      }

      default:
        throw new Error(`Unsupported notification type: ${String(type)}`);
    }
  }
}
