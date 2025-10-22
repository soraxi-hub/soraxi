/**
 * Abstract base class for all notification types
 *
 * This class defines the contract that all notification implementations must follow.
 * It uses the Template Method pattern to ensure consistent behavior across different
 * notification channels (Email, SMS, Push).
 *
 * @abstract
 */
export abstract class Notification {
  /**
   * The recipient identifier (email, phone number, user ID, etc.)
   * @protected
   */
  protected recipient: string;

  /**
   * Optional subject line (primarily used for email notifications)
   * @protected
   */
  protected subject?: string;

  /**
   * Optional message body (used as fallback for plain text)
   * @protected
   */
  protected message?: string;

  /**
   * Constructor for Notification base class
   * @param recipient - The target recipient for the notification
   * @param subject - Optional subject line
   * @param message - Optional message body
   */
  constructor(recipient: string, subject?: string, message?: string) {
    this.recipient = recipient;
    this.subject = subject;
    this.message = message;
  }

  /**
   * Abstract method that must be implemented by all subclasses
   * Handles the actual sending of the notification
   *
   * @abstract
   * @returns Promise that resolves when notification is sent
   * @throws Error if sending fails
   */
  abstract send(): Promise<void>;

  /**
   * Validates the recipient format
   * Can be overridden by subclasses for specific validation rules
   *
   * @protected
   * @returns true if recipient is valid
   */
  protected validateRecipient(): boolean {
    return this.recipient && this.recipient.length > 0 ? true : false;
  }

  /**
   * Logs notification activity for audit trails
   *
   * @protected
   * @param level - Log level (info, warn, error)
   * @param message - Log message
   * @param data - Optional additional data to log
   */
  protected log(
    level: "info" | "warn" | "error",
    message: string,
    data?: any
  ): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    const fn = (console as any)[level];
    if (typeof fn === "function") {
      if (data !== undefined) {
        fn.call(console, logMessage, data);
      } else {
        fn.call(console, logMessage);
      }
    } else {
      // Fallback to console.log if the selected property isn't callable
      if (data !== undefined) {
        console.log(logMessage, data);
      } else {
        console.log(logMessage);
      }
    }
  }
}
