/**
 * Normalize Nigerian phone numbers to a standard format
 * @param phone - The phone number to normalize
 * @example
 * // Returns: "+2347012345678"
 * normalizePhoneNumber("07012345678");
 * @returns The normalized phone number
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, "");

  // Convert local format to international
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return "+234" + cleaned.substring(1);
  }

  // Already in international format
  if (cleaned.startsWith("234") && cleaned.length === 13) {
    return "+" + cleaned;
  }

  return phone; // Return original if format not recognized
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
