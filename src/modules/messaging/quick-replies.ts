import { MessageScopeKindEnum } from "@/enums";
import type { MessagingRole } from "./messaging-client";

/**
 * One-tap replies, offered above the composer.
 *
 * Configuration rather than data: these are the handful of things each side
 * says constantly, and they change by editing this file. Storing them would
 * mean a schema, an admin screen and a migration for something a developer can
 * amend in ten seconds.
 *
 * They differ by role and by what the thread is about — a vendor answering a
 * pre-purchase enquiry needs different phrases from one answering "where is my
 * order?", and offering the wrong set is worse than offering none.
 */
const QUICK_REPLIES: Record<
  MessagingRole,
  Record<MessageScopeKindEnum, string[]>
> = {
  vendor: {
    [MessageScopeKindEnum.Product]: [
      "Yes, in stock",
      "Sorry, sold out",
      "I can deliver today",
      "Send me your hostel",
    ],
    [MessageScopeKindEnum.Order]: [
      "It's being packed now",
      "It's with the campus rider",
      "Out for delivery today",
      "Sorry for the delay",
    ],
  },
  customer: {
    [MessageScopeKindEnum.Product]: [
      "Is this available?",
      "Can you deliver today?",
      "What's your last price?",
    ],
    [MessageScopeKindEnum.Order]: [
      "Where is my order?",
      "Has it shipped?",
      "Thank you 🙏",
    ],
  },
};

export function quickRepliesFor(
  role: MessagingRole,
  scopeKind: string,
): string[] {
  const byScope = QUICK_REPLIES[role];

  return (
    byScope[scopeKind as MessageScopeKindEnum] ??
    byScope[MessageScopeKindEnum.Product]
  );
}
