/**
 * Email Templates Module
 *
 * Exports all available email templates for use with the notification system.
 * Each template is a React component that can be rendered to HTML.
 */

export { EmailContainer } from "./email-container";
export { EmailHeader } from "./email-header";
export { EmailFooter } from "./email-footer";
export { WelcomeEmail } from "./welcome-email";
export {
  OrderConfirmationEmail,
  type OrderItem,
} from "./order-confirmation-email";
export { PasswordResetEmail } from "./password-reset-email";
export { StoreOnboardingEmail } from "./store-onboarding-email";
export { PaymentSettlementEmail } from "./payment-settlement-email";
export { PromotionalEmail } from "./promotional-email";
export { OrderStatusEmail } from "./order-status-email";
export { AdminNotificationEmail } from "./admin-notification-email";
export { OrderFailureEmail } from "./order-failure-email";
export { StoreOrderNotificationEmail } from "./store-order-notification-email";
export { OTPVerificationEmail } from "./otp-verification-email";
export { SupportContactEmail } from "./support-contact-email";
export { EscrowReleaseEmail } from "./escrow-release-email";
