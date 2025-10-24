/**
 * Notifications Module
 *
 * Exports the public API for the notification system including:
 * - Notification factory for creating notification instances
 * - Concrete notification classes
 * - Template rendering utilities
 */

export {
  NotificationFactory,
  // type NotificationType,
  // type NotificationFactoryOptions,
} from "./notification-factory";
export { Notification } from "./notification";
export {
  EmailNotification,
  type EmailType,
  type FromAddress,
  type EmailNotificationOptions,
} from "./email-notification";
export { SMSNotification } from "./sms-notification";
export { PushNotification } from "./push-notification";
export { renderTemplate } from "../../services/notifications/utils/render-template";
export * from "../../services/notifications/templates";
