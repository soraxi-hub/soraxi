/**
 * Auth Policy Constants
 */

/**
 * Shortest an admin account's password can be.
 *
 * Admin passwords are created/updated by another admin (`admin-management`
 * procedures), not through self-service signup, so there's no complexity
 * regex here — just the same floor enforced at creation, update, and sign-in
 * so a password valid at creation time can never fail at login.
 */
export const ADMIN_PASSWORD_MIN_LENGTH = 8;
