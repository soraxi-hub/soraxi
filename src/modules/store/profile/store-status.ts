import { StoreStatusEnum } from "@/enums";

/**
 * How a store's moderation status reads to its **owner**.
 *
 * Deliberately different wording from the public storefront. A shopper needs to
 * know whether they can buy; an owner needs to know what to do next. "Pending
 * review" tells a vendor nothing actionable — "Not live yet" tells them their
 * shop isn't earning and why.
 */
export type StoreStatusTone = "live" | "pending" | "suspended";

export interface StoreStatusView {
  tone: StoreStatusTone;
  /** Badge next to the store name. */
  label: string;
  /** Row value in the Account card. */
  accountLabel: string;
}

export function ownerStatusView(
  status: StoreStatusEnum | "unknown",
): StoreStatusView {
  switch (status) {
    case StoreStatusEnum.Active:
      return { tone: "live", label: "Live", accountLabel: "Live" };

    case StoreStatusEnum.Suspended:
    case StoreStatusEnum.Rejected:
      return {
        tone: "suspended",
        label: "Suspended",
        accountLabel: "Suspended",
      };

    default:
      // Pending and anything unrecognised. An owner should never be told their
      // store is fine when we are not sure that it is.
      return { tone: "pending", label: "Not live yet", accountLabel: "Not live" };
  }
}

/** Badge classes per tone. Yellow needs dark text in both themes to stay legible. */
export const statusBadgeClass: Record<StoreStatusTone, string> = {
  live: "bg-soraxi-green/10 text-soraxi-green",
  pending: "bg-soraxi-warning/20 text-yellow-700 dark:text-soraxi-warning",
  suspended: "bg-soraxi-error/10 text-soraxi-error",
};
