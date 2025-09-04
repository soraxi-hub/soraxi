/**
 * Normalize Nigerian phone numbers to a standard format
 * Converts various valid input formats into the canonical "+234XXXXXXXXXX" form.
 *
 * Supported input formats:
 * - Local with leading "0" (e.g., "07012345678")
 * - Local without leading "0" (e.g., "7012345678")
 * - International with country code (e.g., "2347012345678")
 * - International with "+" (e.g., "+2347012345678")
 * - International with "00" prefix (e.g., "002347012345678")
 *
 * @param phone - The phone number to normalize
 * @example
 * // Returns: "+2347012345678"
 * normalizePhoneNumber("07012345678");
 * @returns The normalized phone number in "+234XXXXXXXXXX" format,
 * or the original input if format not recognized
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove surrounding spaces and all non-digit characters
  const cleaned = phone.trim().replace(/\D/g, "");

  // Local format with trunk prefix "0" (e.g., 07012345678 → +2347012345678)
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return "+234" + cleaned.substring(1);
  }

  // Local format without trunk "0" (e.g., 7012345678 → +2347012345678)
  if (/^[789]\d{9}$/.test(cleaned)) {
    return "+234" + cleaned;
  }

  // Already in international format without "+" (e.g., 2347012345678 → +2347012345678)
  if (cleaned.startsWith("234") && cleaned.length === 13) {
    return "+" + cleaned;
  }

  // International format with "+" (e.g., +2347012345678 → +2347012345678)
  if (cleaned.startsWith("234") && cleaned.length === 13) {
    return "+" + cleaned;
  }

  // International format with "00" prefix (e.g., 002347012345678 → +2347012345678)
  if (cleaned.startsWith("00234") && cleaned.length === 15) {
    return "+234" + cleaned.substring(5);
  }

  // Return original if format not recognized
  return phone;
}

/**
 * Validate Nigerian phone numbers
 * @param phone - The phone number to validate
 * @returns True if the phone number is valid, false otherwise
 */
export function validateNigerianPhone(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);
  const phoneRegex = /^\+234[789][01]\d{8}$/;
  return phoneRegex.test(normalized);
}
