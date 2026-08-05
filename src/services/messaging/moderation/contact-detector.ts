/**
 * Detects contact details in message bodies.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 * The costliest abuse on a marketplace is a vendor moving the deal off-platform
 * — "don't pay through the app, send me the money directly". It strips buyer
 * protection from the customer and commission from the platform, and **both
 * parties are usually happy about it**, so nobody reports it. A report button
 * is structurally blind to it. This is not.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY IT ONLY FLAGS
 * ─────────────────────────────────────────────────────────────────────────────
 * On a campus marketplace, exchanging a phone number is usually *legitimate* —
 * riders call on delivery, and "08012345678, call when you reach the gate" is
 * a normal message. Blocking those would break the product to catch a minority.
 *
 * So detection never blocks and never edits: the message sends exactly as
 * written, and the conversation is queued for a human to look at. The sender is
 * not told, deliberately — a warning teaches evaders precisely what to avoid.
 *
 * Treat the output as a *prior*, not a verdict. It is deliberately noisy, and
 * the review queue is where judgement happens.
 */

import { ModerationFlagReasonEnum } from "@/enums";

/**
 * Nigerian mobile numbers, the dominant case.
 *
 * Tolerates the separators people actually type — spaces, dots, hyphens — since
 * "0803 123 4567" is the same number as "08031234567" and anyone evading
 * detection would reach for exactly that.
 */
const NG_PHONE = /(?:\+?234|0)\s*[-.]?\s*[789]\d(?:\s*[-.]?\s*\d){8}/;

/**
 * Digits spelled out, e.g. "zero eight zero three one two...".
 *
 * Only fires on four or more consecutive spelled digits: shorter runs match
 * ordinary sentences ("two or three of them"), and four in a row is not
 * something anyone writes by accident.
 */
const SPELLED_DIGITS =
  /\b(?:zero|one|two|three|four|five|six|seven|eight|nine|oh)\b(?:[\s,-]+\b(?:zero|one|two|three|four|five|six|seven|eight|nine|oh)\b){3,}/i;

const EMAIL = /[\w.+-]+\s*(?:@|\(at\)|\[at\])\s*[\w-]+\s*(?:\.|\(dot\))\s*\w{2,}/i;

/**
 * Named off-platform channels.
 *
 * The word alone is enough to be worth a look — "message me on WhatsApp" is
 * the whole problem, with or without a number attached.
 */
const OFF_PLATFORM_CHANNEL =
  /\b(?:whats\s?app|wa\.me|telegram|t\.me|snapchat|instagram|\big\b|dm\s+me)\b/i;

/**
 * Phrases that solicit payment outside the platform.
 *
 * These are the highest-signal matches in the whole detector: a phone number is
 * ambiguous, but "pay me directly" is not.
 */
const OFF_PLATFORM_PAYMENT =
  /\b(?:pay(?:ment)?\s+(?:me\s+)?(?:direct(?:ly)?|outside|off\s?app)|send\s+(?:the\s+)?money\s+(?:direct(?:ly)?|to\s+my)|transfer\s+to\s+my\s+account|bank\s+transfer\s+direct|cash\s+on\s+hand|outside\s+(?:the\s+)?(?:app|platform)|avoid\s+(?:the\s+)?(?:app|platform|charges?|fees?))\b/i;

export interface ContactDetectionResult {
  flagged: boolean;
  /** Which signals fired — stored on the flag so reviewers see the reasoning. */
  signals: string[];
}

/**
 * Scans a message body for contact details and off-platform solicitation.
 *
 * Pure and synchronous: no I/O, so it can run on the send path without adding
 * latency, and it is trivially unit-testable.
 */
export function detectContactDetails(body: string): ContactDetectionResult {
  const signals: string[] = [];

  if (NG_PHONE.test(body)) signals.push("phone_number");
  if (SPELLED_DIGITS.test(body)) signals.push("spelled_digits");
  if (EMAIL.test(body)) signals.push("email");
  if (OFF_PLATFORM_CHANNEL.test(body)) signals.push("off_platform_channel");
  if (OFF_PLATFORM_PAYMENT.test(body)) signals.push("off_platform_payment");

  return { flagged: signals.length > 0, signals };
}

export const CONTACT_FLAG_REASON = ModerationFlagReasonEnum.ContactDetails;
