/**
 * MVP Fund Release Logic
 * -----------------------
 * Simplified fund release rules designed for a small e-commerce startup.
 * This removes advanced conditions, buyer protection, store tiers,
 * business-day calculations, disputes, returns, and custom triggers.
 *
 * Only three conditions are required for fund release:
 *   1. paymentCleared
 *   2. deliveryConfirmed
 *   3. waitingPeriodPassed
 *
 * Future scalability:
 * - You can later reintroduce complex tiers, business days,
 *   buyer protection, chargeback logic, and full rule engine.
 */

import {
  FundReleaseStatus,
  FundReleaseTrigger,
  IFundRelease,
} from "../db/models/fund-release.model";
import type { IStore } from "../db/models/store.model";

/**
 * Simple store categories:
 * - Verified stores get faster release (3 days)
 * - Unverified stores get 7-day release
 */
export const SIMPLE_FUND_RULES = {
  verified: { businessDaysRequired: 3, deliveryRequired: true },
  unverified: { businessDaysRequired: 7, deliveryRequired: true },
};

/**
 * Get the simple rule set for a store.
 * MVP does not use ratings, complaints, order count, or advanced risk.
 */
export function getSimpleStoreStatus(store: IStore): "verified" | "unverified" {
  return store.verification?.isVerified ? "verified" : "unverified";
}

/**
 * Compute scheduled release date using plain calendar days.
 * MVP does NOT exclude weekends or holidays.
 */
// export function addDays(date: Date, numDays: number): Date {
//   const newDate = new Date(date);
//   newDate.setDate(newDate.getDate() + numDays);
//   return newDate;
// }

/**
 * Calculate business days until release
 * Excludes weekends and optionally holidays
 */
export function calculateBusinessDaysUntil(
  fromDate: Date,
  businessDays: number,
  holidays: Date[] = []
): Date {
  const currentDate = new Date(fromDate);
  let daysAdded = 0;

  while (daysAdded < businessDays) {
    currentDate.setDate(currentDate.getDate() + 1);

    // Skip weekends (Saturday = 6, Sunday = 0)
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;

    // Skip holidays
    if (holidays.some((h) => h.toDateString() === currentDate.toDateString())) {
      continue;
    }

    daysAdded++;
  }

  return currentDate;
}

/**
 * MVP Conditions Check
 * - Payment cleared
 * - Delivery confirmed
 * - Scheduled wait period has passed
 */
export function areMvpConditionsMet(fundRelease: IFundRelease): boolean {
  const now = new Date();

  // Check if waiting period (i.e., Scheduled Release Time) has passed
  const waitingPeriodPassed = fundRelease.scheduledReleaseTime
    ? now >= new Date(fundRelease.scheduledReleaseTime)
    : false;

  /**
   * Check all three MVP conditions
   *
   * 1. paymentCleared
   * 2. deliveryConfirmed
   * 3. waitingPeriodPassed
   */
  return (
    fundRelease.conditionsMet.paymentCleared &&
    fundRelease.conditionsMet.deliveryConfirmed &&
    waitingPeriodPassed
  );
}

/**
 * Determine the trigger that caused release (if all conditions met)
 */
export function determineFundReleaseTrigger(
  fundRelease: IFundRelease
  // previousStatus: FundReleaseStatus
): FundReleaseTrigger | null {
  const { conditionsMet } = fundRelease;

  // If delivery just confirmed, that's the trigger
  if (conditionsMet.deliveryConfirmed && !fundRelease.deliveryConfirmedAt) {
    return FundReleaseTrigger.DeliveryConfirmed;
  }

  // If buyer protection just expired
  if (
    conditionsMet.buyerProtectionExpired &&
    fundRelease.buyerProtectionExpiresAt &&
    new Date() >= fundRelease.buyerProtectionExpiresAt
  ) {
    return FundReleaseTrigger.BuyerProtectionExpired;
  }

  // If time elapsed (business days passed)
  if (
    fundRelease.scheduledReleaseTime &&
    new Date() >= fundRelease.scheduledReleaseTime
  ) {
    return FundReleaseTrigger.TimeElapsed;
  }

  return null;
}

/**
 * Human-readable explanation for UI
 */
export function getMvpStatusExplanation(fundRelease: {
  status: string;
  conditionsMet: {
    paymentCleared: boolean;
    deliveryConfirmed: boolean;
  };
  scheduledReleaseTime: Date;
  actualReleasedAt?: Date;
}): string {
  const { status, conditionsMet, scheduledReleaseTime } = fundRelease;

  if (status === FundReleaseStatus.Pending) {
    const missing = [];
    if (!conditionsMet.paymentCleared) missing.push("payment clearance");
    if (!conditionsMet.deliveryConfirmed) missing.push("delivery confirmation");

    const now = new Date();
    if (now < scheduledReleaseTime) {
      missing.push(
        `waiting period (until ${scheduledReleaseTime.toLocaleDateString()})`
      );
    }

    return `Pending — waiting for ${missing.join(", ")}`;
  }

  if (status === FundReleaseStatus.Ready)
    return "Ready to release — processing soon";
  if (status === FundReleaseStatus.Processing)
    return "Processing — transferring funds";
  if (status === FundReleaseStatus.Released)
    return `Released on ${fundRelease.actualReleasedAt?.toLocaleDateString()}`;

  return "Unknown status";
}

/**
 * Get human-readable label for fund release trigger
 *
 * @param trigger of enum FundReleaseTrigger
 * @returns string
 */
export function getTriggerLabel(trigger?: FundReleaseTrigger): string {
  if (!trigger) return "—";
  switch (trigger) {
    case FundReleaseTrigger.TimeElapsed:
      return "Time elapsed";
    case FundReleaseTrigger.DeliveryConfirmed:
      return "Delivery confirmed";
    case FundReleaseTrigger.AutoConfirmedDelivery:
      return "Auto-confirmed";
    case FundReleaseTrigger.BuyerProtectionExpired:
      return "Protection expired";

    case FundReleaseTrigger.AdminApproved:
      return "Admin approved";
    case FundReleaseTrigger.AdminForced:
      return "Admin forced";

    case FundReleaseTrigger.OrderCancelled:
      return "Order cancelled";
    case FundReleaseTrigger.DisputeResolved:
      return "Dispute resolved";
    case FundReleaseTrigger.ReturnCompleted:
      return "Return completed";

    default:
      return "Unknown";
  }
}

// DO NOT DELETE - ORIGINAL FULL FUND RELEASE LOGIC BELOW. THE ONE ABOVE IS FOR OUR MVP PRODUCT.

// /**
//  * Fund Release Logic
//  * Determines when and how funds should be released from escrow
//  * This is the core business logic for fund release decisions
//  */

// import type { IStore } from "../db/models/store.model";
// import {
//   FundReleaseTrigger,
//   FundReleaseStatus,
//   type IFundRelease,
//   StoreTierEnum,
// } from "../db/models/fund-release.model";

// /**
//  * Fund Release Rules - Configurable per tier
//  * Can be adjusted based on business needs
//  */
// export const FUND_RELEASE_RULES = {
//   new: {
//     businessDaysRequired: 7, // 7 business days for new stores
//     deliveryRequired: true,
//     buyerProtectionDays: 14, // 14 days buyer protection window
//     description: "New store - extended hold period",
//   },
//   trusted: {
//     businessDaysRequired: 3, // 3 business days for trusted stores
//     deliveryRequired: true,
//     buyerProtectionDays: 7, // 7 days buyer protection
//     description: "Trusted store - standard hold",
//   },
//   established: {
//     businessDaysRequired: 1, // 1 business day for established stores
//     deliveryRequired: true,
//     buyerProtectionDays: 3, // 3 days minimal protection
//     description: "Established store - fast release",
//   },
//   unverified: {
//     businessDaysRequired: 14, // 14 days for unverified stores
//     deliveryRequired: true,
//     buyerProtectionDays: 14, // 14 days extended protection
//     description: "Unverified store - maximum hold",
//   },
// };

// /**
//  * Determine store tier based on store metrics
//  */
// export function getStoreTier(store: IStore): StoreTierEnum {
//   // Check verification status first
//   if (!store.verification?.isVerified) {
//     // Can still progress new stores to trusted tier based on order history
//     // This would be determined by: order count, positive ratings, etc
//     // For now, unverified = new tier
//     return StoreTierEnum.New;
//   }

//   // Check ratings, complaint count, order history, etc.
//   const complaintRate = store.ratings?.complaintCount || 0;
//   const reviewCount = store.ratings?.reviewCount || 0;
//   const averageRating = store.ratings?.averageRating || 0;

//   // Established: 100+ reviews, 4.7+ rating, <1% complaints
//   if (reviewCount >= 100 && averageRating >= 4.7 && complaintRate <= 1) {
//     return StoreTierEnum.Established;
//   }

//   // Trusted: 20+ reviews, 4.5+ rating, <2% complaints
//   if (reviewCount >= 20 && averageRating >= 4.5 && complaintRate <= 2) {
//     return StoreTierEnum.Trusted;
//   }

//   // Default: new verified seller
//   return StoreTierEnum.New;
// }

// /**
//  * Calculate business days until release
//  * Excludes weekends and optionally holidays
//  */
// export function calculateBusinessDaysUntil(
//   fromDate: Date,
//   businessDays: number,
//   holidays: Date[] = []
// ): Date {
//   const currentDate = new Date(fromDate);
//   let daysAdded = 0;

//   while (daysAdded < businessDays) {
//     currentDate.setDate(currentDate.getDate() + 1);

//     // Skip weekends (Saturday = 6, Sunday = 0)
//     const dayOfWeek = currentDate.getDay();
//     if (dayOfWeek === 0 || dayOfWeek === 6) continue;

//     // Skip holidays
//     if (holidays.some((h) => h.toDateString() === currentDate.toDateString())) {
//       continue;
//     }

//     daysAdded++;
//   }

//   return currentDate;
// }

// /**
//  * Determine if all conditions are met for fund release
//  */
// export function checkAllConditionsMet(fundRelease: IFundRelease): boolean {
//   const { conditionsMet } = fundRelease;

//   return (
//     conditionsMet.paymentCleared &&
//     conditionsMet.verificationComplete &&
//     conditionsMet.deliveryConfirmed &&
//     conditionsMet.buyerProtectionExpired &&
//     conditionsMet.noActiveDisputes &&
//     conditionsMet.noActiveReturns &&
//     conditionsMet.noChargebacks
//   );
// }

// /**
//  * Calculate what conditions still need to be met
//  */
// export function getPendingConditions(fundRelease: IFundRelease): string[] {
//   const pending: string[] = [];
//   const { conditionsMet } = fundRelease;

//   if (!conditionsMet.paymentCleared) pending.push("Payment clearance");
//   if (!conditionsMet.verificationComplete) pending.push("Store verification");
//   if (!conditionsMet.deliveryConfirmed) pending.push("Delivery confirmation");
//   if (!conditionsMet.buyerProtectionExpired)
//     pending.push("Buyer protection period");
//   if (!conditionsMet.noActiveDisputes) pending.push("Dispute resolution");
//   if (!conditionsMet.noActiveReturns) pending.push("Return completion");
//   if (!conditionsMet.noChargebacks) pending.push("Chargeback resolution");

//   return pending;
// }

// /**
//  * Determine the trigger that caused release (if all conditions met)
//  */
// export function determineFundReleaseTrigger(
//   fundRelease: IFundRelease,
//   previousStatus: FundReleaseStatus
// ): FundReleaseTrigger | null {
//   const { conditionsMet } = fundRelease;

//   // If delivery just confirmed, that's the trigger
//   if (conditionsMet.deliveryConfirmed && !fundRelease.deliveryConfirmedAt) {
//     return FundReleaseTrigger.DeliveryConfirmed;
//   }

//   // If buyer protection just expired
//   if (
//     conditionsMet.buyerProtectionExpired &&
//     fundRelease.buyerProtectionExpiresAt &&
//     new Date() >= fundRelease.buyerProtectionExpiresAt
//   ) {
//     return FundReleaseTrigger.BuyerProtectionExpired;
//   }

//   // If time elapsed (business days passed)
//   if (
//     fundRelease.scheduledReleaseTime &&
//     new Date() >= fundRelease.scheduledReleaseTime
//   ) {
//     return FundReleaseTrigger.TimeElapsed;
//   }

//   return null;
// }

// /**
//  * Get human-readable status explanation
//  */
// export function getStatusExplanation(fundRelease: IFundRelease): string {
//   const { status, conditionsMet } = fundRelease;

//   switch (status) {
//     case FundReleaseStatus.Pending:
//       const pending = getPendingConditions(fundRelease);
//       return `Pending — will release after ${pending.join(", ").toLowerCase()}`;

//     case FundReleaseStatus.Ready:
//       return "Ready to release — processing shortly";

//     case FundReleaseStatus.Processing:
//       return "Processing payment — funds being transferred";

//     case FundReleaseStatus.Released:
//       return `Released on ${fundRelease.actualReleasedAt?.toLocaleDateString()}`;

//     case FundReleaseStatus.Failed:
//       return "Release failed — admin review required";

//     case FundReleaseStatus.Reversed:
//       return "Release reversed — chargeback or dispute";

//     default:
//       return "Unknown status";
//   }
// }
