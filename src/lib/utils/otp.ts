import crypto from "crypto";

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
  let otp = "";
  const randomBytes = crypto.getRandomValues(new Uint8Array(length));

  for (let i = 0; i < length; i++) {
    otp += digits[randomBytes[i] % digits.length];
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
