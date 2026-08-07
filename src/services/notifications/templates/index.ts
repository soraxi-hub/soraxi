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
export { PayoutCompletedEmail } from "./payout-completed-email";
export { VendorInviteEmail } from "./vendor-invite-email";
export { VendorApplicationApprovedEmail } from "./vendor-approve-email";
export { WaitlistRejectionEmail } from "./waitlist-rejection-email";
export { WaitlistConfirmationEmail } from "./waitlist-confirmation-email";
export { PayoutFailedEmail } from "./payout-failed-email";
export { PromotionalEmail } from "./promotional-email";
export { OrderStatusEmail } from "./order-status-email";
export { AdminNotificationEmail } from "./admin-notification-email";
export { OrderFailureEmail } from "./order-failure-email";
export { StoreOrderNotificationEmail } from "./store-order-notification-email";
export { OTPVerificationEmail } from "./otp-verification-email";
export { SupportContactEmail } from "./support-contact-email";
export { EscrowReleaseEmail } from "./escrow-release-email";
export { RefundIssuedEmail } from "./refund-issued-email";
export { StoreApprovedEmail } from "../templates/store/store-approved-email";
export { StoreReactivatedEmail } from "../templates/store/store-reactivated-email";
export { StoreRejectedEmail } from "../templates/store/store-rejected-email";
export { StoreSuspendedEmail } from "../templates/store/store-suspended-email";
export { DisputeAutoResolvedCustomerEmail } from "./dispute-auto-resolved-customer-email";
export { DisputeAutoResolvedVendorEmail } from "./dispute-auto-resolved-vendor-email";
export { DisputeAutoResolvedAdminEmail } from "./dispute-auto-resolved-admin-email";
export { DisputeEvidenceExpiredCustomerEmail } from "./dispute-evidence-expired-customer-email";
export { DisputeEvidenceExpiredVendorEmail } from "./dispute-evidence-expired-vendor-email";
export { OutForDeliveryEmail } from "./out-for-delivery-email";
