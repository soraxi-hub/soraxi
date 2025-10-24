import "server-only";
import { randomInt } from "node:crypto";

// Constants
export const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 15,
  MAX_ATTEMPTS: 5,
  ATTEMPT_RESET_MINUTES: 15,
  MIN_REQUEST_INTERVAL_SECONDS: 30, // Prevent spam
};

/**
 * Generate a cryptographically secure OTP
 */
export function generateSecureOTP(length: number = OTP_CONFIG.LENGTH): string {
  const digits = "0123456789";
  // Guard: keep OTP lengths reasonable and non-zero
  const len =
    Number.isInteger(length) && length > 0 && length <= 10
      ? length
      : OTP_CONFIG.LENGTH;
  let otp = "";
  for (let i = 0; i < len; i++) {
    otp += digits[randomInt(10)];
  }
  return otp;
}

/**
 * Calculate OTP expiry time
 */
export function getOTPExpiry(
  minutesFromNow: number = OTP_CONFIG.EXPIRY_MINUTES
): Date {
  return new Date(Date.now() + minutesFromNow * 60 * 1000);
}

/**
 * Check if OTP is expired
 */
export function isOTPExpired(expiryDate: Date): boolean {
  return new Date() > expiryDate;
}

/**
 * Check if user can request OTP (rate limiting)
 */
export function canRequestOTP(lastRequestAt: Date | null): boolean {
  if (!lastRequestAt) return true;

  const secondsSinceLastRequest = (Date.now() - lastRequestAt.getTime()) / 1000;
  return secondsSinceLastRequest >= OTP_CONFIG.MIN_REQUEST_INTERVAL_SECONDS;
}

/**
 * Check if user has exceeded OTP verification attempts
 */
export function hasExceededAttempts(
  attempts: number,
  attemptsResetAt: Date | null
): boolean {
  if (attempts < OTP_CONFIG.MAX_ATTEMPTS) return false;

  // Reset attempts if window has passed
  if (attemptsResetAt && new Date() > attemptsResetAt) return false;

  return true;
}
