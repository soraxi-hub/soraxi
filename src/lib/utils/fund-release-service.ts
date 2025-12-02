/**
 * MVP Fund Release Service
 * -------------------------
 * Handles creation, updating, and releasing escrow funds
 * using the simplified MVP rules.
 *
 * Removed features:
 * - Store tiers
 * - Buyer protection
 * - Business-day logic
 * - Dispute tracking
 * - Chargebacks
 * - Multi-step condition booleans
 * - Complex commission structures
 */

import mongoose from "mongoose";
import {
  getWalletModel,
  WalletTransactionRelatedDocumentType,
  WalletTransactionSource,
  WalletTransactionType,
} from "../db/models/wallet.model";
import {
  SIMPLE_FUND_RULES,
  getSimpleStoreStatus,
  areMvpConditionsMet,
  calculateBusinessDaysUntil,
  determineFundReleaseTrigger,
} from "./fund-release-logic";

import {
  FundReleaseStatus,
  getFundReleaseModel,
  StoreTierEnum,
  StoreVerificationStatusEnumUsedByFundRelease,
  type IFundRelease,
} from "../db/models/fund-release.model";

import type { IOrder, ISubOrder } from "../db/models/order.model";
import type { IStore } from "../db/models/store.model";
import { CommissionService } from "@/services/commission.service";
import { currencyOperations } from "./naira";
import { WalletTransactionService } from "@/services/wallet-transaction.service";

/**
 * Create a new fund release
 */
export async function createFundRelease(
  store: IStore,
  order: IOrder,
  subOrder: ISubOrder,
  session: mongoose.ClientSession | null
): Promise<IFundRelease> {
  const FundRelease = await getFundReleaseModel();
  const commissionService = new CommissionService();

  const status = getSimpleStoreStatus(store);
  const rules = SIMPLE_FUND_RULES[status];
  const isVerified = store.verification?.isVerified || false;

  const scheduledReleaseTime = calculateBusinessDaysUntil(
    order.createdAt,
    rules.businessDaysRequired
  );

  // Calculate financial Details
  // Calculate commission (we will make this dynamic in the future based on store tier)
  const commissionResult = commissionService.calculateCommission(
    subOrder.totalAmount
  );

  const settlementDetails = {
    // Settlement after commission
    settleAmount: commissionResult.settleAmount,
    commission: commissionResult.commission,
    appliedPercentageFee: commissionResult.details.percentageFee,
    appliedFlatFee: commissionResult.details.flatFeeApplied,
  };

  const fundRelease = new FundRelease({
    storeId: store._id,
    orderId: order._id,
    subOrderId: subOrder._id,
    walletId: store.walletId,

    settlement: {
      amount: settlementDetails.settleAmount,
      shippingPrice: subOrder.shippingMethod
        ? subOrder.shippingMethod.price
        : 0,
      commission: settlementDetails.commission,
      appliedPercentageFee: settlementDetails.appliedPercentageFee,
      appliedFlatFee: settlementDetails.appliedFlatFee,
    },

    releaseRules: {
      verificationStatus: isVerified
        ? StoreVerificationStatusEnumUsedByFundRelease.Verified
        : StoreVerificationStatusEnumUsedByFundRelease.Unverified,
      storeTier: StoreTierEnum.New, // Simplified - all stores treated as 'New' in MVP
      businessDaysRequired: rules.businessDaysRequired,
      deliveryRequired: rules.deliveryRequired,
      // buyerProtectionDays: rules.buyerProtectionDays,
    },

    orderPlacedAt: order.createdAt,
    scheduledReleaseTime,

    status: FundReleaseStatus.Pending,

    conditionsMet: {
      paymentCleared: true, // true because we have received the payment before creating this fund release
      paymentClearedAt: new Date(), // If paymentCleared above is changed to false, this should be null or removed
      verificationComplete: isVerified,
      deliveryConfirmed: false,
      buyerProtectionExpired: true,
    },
  });

  await fundRelease.save({ session });
  return fundRelease;
}

/**
 * Update a condition (paymentConfirmed or deliveryConfirmed)
 *
 * Update fund release status when conditions are met
 */
export async function updateFundReleaseCondition(
  fundReleaseId: string,
  condition: "deliveryConfirmed" | "paymentCleared",
  value: boolean
): Promise<IFundRelease | null> {
  const FundRelease = await getFundReleaseModel();

  const fundRelease = await FundRelease.findById(fundReleaseId);
  if (!fundRelease) return null;

  fundRelease.conditionsMet[condition] = value;

  // Move to READY once MVP conditions are met
  if (
    fundRelease.status === FundReleaseStatus.Pending &&
    areMvpConditionsMet(fundRelease)
  ) {
    fundRelease.status = FundReleaseStatus.Ready;
  }

  await fundRelease.save();
  return fundRelease;
}

/**
 * Process a READY release — moves money into wallet
 */
export async function processFundRelease(
  fundReleaseId: string
): Promise<{ success: boolean; error?: string }> {
  const FundRelease = await getFundReleaseModel();
  const Wallet = await getWalletModel();

  const fundRelease = await FundRelease.findById(
    new mongoose.Types.ObjectId(fundReleaseId)
  );
  if (!fundRelease) return { success: false, error: "Fund release not found" };

  if (fundRelease.status !== FundReleaseStatus.Ready) {
    return {
      success: false,
      error: `Cannot process - status is ${fundRelease.status}`,
    };
  }

  try {
    // Update fund release to processing
    fundRelease.status = FundReleaseStatus.Processing;
    await fundRelease.save();

    // Update wallet - move from pending to balance
    const wallet = await Wallet.findById(fundRelease.walletId);
    if (!wallet) throw new Error("Wallet not found");

    wallet.pending = Math.max(
      0,
      currencyOperations.subtract(
        wallet.pending || 0,
        fundRelease.settlement.amount,
        fundRelease.settlement.shippingPrice
      )
    );
    wallet.balance = currencyOperations.add(
      wallet.balance || 0,
      fundRelease.settlement.amount,
      fundRelease.settlement.shippingPrice
    );
    await wallet.save();

    // Create wallet transaction record
    await WalletTransactionService.create({
      walletId: (wallet._id as unknown as mongoose.Types.ObjectId).toString(),
      type: WalletTransactionType.Credit,
      amount: currencyOperations.add(
        fundRelease.settlement.amount,
        fundRelease.settlement.shippingPrice
      ),
      source: WalletTransactionSource.Adjustment,
      relatedDocumentId: fundRelease._id.toString(),
      relatedDocumentType: WalletTransactionRelatedDocumentType.FundRelease,
      description: "Escrow credited to balance",
    });

    // Mark as released
    fundRelease.status = FundReleaseStatus.Released;
    fundRelease.actualReleasedAt = new Date();
    await fundRelease.save();

    return { success: true };
  } catch (e) {
    fundRelease.status = FundReleaseStatus.Failed;
    fundRelease.adminNotes = e instanceof Error ? e.message : "Unknown error";
    await fundRelease.save();

    return { success: false, error: fundRelease.adminNotes };
  }
}

/**
 * Reverse a RELEASED fund release — moves money back from wallet balance to pending
 */
export async function reverseProcessedFundRelease(
  fundReleaseId: string
): Promise<{ success: boolean; error?: string }> {
  const FundRelease = await getFundReleaseModel();
  const Wallet = await getWalletModel();

  const fundRelease = await FundRelease.findById(
    new mongoose.Types.ObjectId(fundReleaseId)
  );
  if (!fundRelease) return { success: false, error: "Fund release not found" };

  if (fundRelease.status !== FundReleaseStatus.Released) {
    return {
      success: false,
      error: `Cannot reverse - status is ${fundRelease.status}`,
    };
  }

  try {
    // Update fund release to processing
    fundRelease.status = FundReleaseStatus.Processing;
    await fundRelease.save();

    // Update wallet - move from balance to pending.
    const wallet = await Wallet.findById(fundRelease.walletId);
    if (!wallet) throw new Error("Wallet not found");

    wallet.pending = Math.max(
      0,
      currencyOperations.add(
        wallet.pending || 0,
        fundRelease.settlement.amount,
        fundRelease.settlement.shippingPrice
      )
    );
    wallet.balance = currencyOperations.subtract(
      wallet.balance || 0,
      fundRelease.settlement.amount,
      fundRelease.settlement.shippingPrice
    );
    await wallet.save();

    // Create wallet transaction record
    await WalletTransactionService.create({
      walletId: (wallet._id as unknown as mongoose.Types.ObjectId).toString(),
      type: WalletTransactionType.Debit,
      amount: currencyOperations.add(
        fundRelease.settlement.amount,
        fundRelease.settlement.shippingPrice
      ),
      source: WalletTransactionSource.Adjustment,
      relatedDocumentId: fundRelease._id.toString(),
      relatedDocumentType: WalletTransactionRelatedDocumentType.FundRelease,
      description: "Escrow reversed: debited from balance",
    });

    // Mark as reversed
    fundRelease.status = FundReleaseStatus.Reversed;
    await fundRelease.save();

    return { success: true };
  } catch (e) {
    fundRelease.status = FundReleaseStatus.Failed;
    fundRelease.adminNotes = e instanceof Error ? e.message : "Unknown error";
    await fundRelease.save();

    return { success: false, error: fundRelease.adminNotes };
  }
}

/**
 * Cron: auto-check pending releases
 * Marks them as READY once waiting time + delivery confirmed
 */
export async function autoTransitionPendingReleases() {
  const FundRelease = await getFundReleaseModel();

  // Find all pending fund releases
  const pendingReleases = await FundRelease.find({
    status: FundReleaseStatus.Pending,
  });

  let transitioned = 0;

  for (const release of pendingReleases) {
    if (areMvpConditionsMet(release)) {
      release.status = FundReleaseStatus.Ready;
      release.trigger = determineFundReleaseTrigger(release) || undefined;
      await release.save();
      transitioned++;
    }
  }

  return { checked: pendingReleases.length, transitioned };
}

// DO NOT DELETE - ORIGINAL FULL FUND RELEASE SERVICE BELOW. THE ONE ABOVE IS FOR OUR MVP PRODUCT.

// /**
//  * Fund Release Service
//  * Handles creating, updating, and processing fund releases
//  * This interacts with the FundRelease model and business logic
//  */

// import { CommissionService } from "@/services/commission.service";
// import {
//   FundReleaseStatus,
//   getFundReleaseModel,
//   StoreTierEnum,
//   StoreVerificationStatusEnumUsedByFundRelease,
//   type IFundRelease,
// } from "../db/models/fund-release.model";
// import type { IOrder, ISubOrder } from "../db/models/order.model";
// import type { IStore } from "../db/models/store.model";
// import { getWalletModel } from "../db/models/wallet.model";
// import {
//   calculateBusinessDaysUntil,
//   checkAllConditionsMet,
//   determineFundReleaseTrigger,
//   FUND_RELEASE_RULES,
//   getStoreTier,
// } from "./fund-release-logic";
// import mongoose from "mongoose";

// // Define the valid boolean conditions explicitly
// const VALID_BOOLEAN_CONDITIONS = [
//   "paymentCleared",
//   "verificationComplete",
//   "deliveryConfirmed",
//   "buyerProtectionExpired",
//   "noActiveDisputes",
//   "noActiveReturns",
//   "noChargebacks",
// ] as const;

// type BooleanConditions = (typeof VALID_BOOLEAN_CONDITIONS)[number];

// /**
//  * Create a new fund release record when order is placed
//  */
// export async function createFundRelease(
//   store: IStore,
//   order: IOrder,
//   subOrder: ISubOrder,
//   session: mongoose.ClientSession | null
// ): Promise<IFundRelease> {
//   const FundRelease = await getFundReleaseModel();
//   const commissionService = new CommissionService();

//   // Determine store tier and rules
//   const storeTier = getStoreTier(store);
//   const isVerified = store.verification?.isVerified || false;
//   const rules = FUND_RELEASE_RULES[isVerified ? storeTier : "unverified"];

//   // Calculate scheduled release time
//   const orderPlacedAt = order.createdAt;
//   const scheduledReleaseTime = calculateBusinessDaysUntil(
//     orderPlacedAt,
//     rules.businessDaysRequired
//   );

//   // Calculate buyer protection expiry
//   const buyerProtectionExpiresAt = new Date(orderPlacedAt);
//   buyerProtectionExpiresAt.setDate(
//     buyerProtectionExpiresAt.getDate() + rules.buyerProtectionDays
//   );

//   // Calculate financial Details
//   // Calculate commission (we will make this dynamic in the future based on store tier)
//   const commissionResult = commissionService.calculateCommission(
//     subOrder.totalAmount
//   );

//   const settlementDetails = {
//     // Settlement after commission
//     settleAmount: commissionResult.settleAmount,
//     commission: commissionResult.commission,
//     appliedPercentageFee: commissionResult.details.percentageFee,
//     appliedFlatFee: commissionResult.details.flatFeeApplied,
//   };

//   const fundRelease = new FundRelease({
//     storeId: store._id,
//     orderId: order._id,
//     subOrderId: subOrder._id,
//     walletId: store.walletId,

//     settlement: {
//       amount: settlementDetails.settleAmount,
//       shippingPrice: subOrder.shippingMethod
//         ? subOrder.shippingMethod.price
//         : 0,
//       commission: settlementDetails.commission,
//       appliedPercentageFee: settlementDetails.appliedPercentageFee,
//       appliedFlatFee: settlementDetails.appliedFlatFee,
//     },

//     releaseRules: {
//       verificationStatus: isVerified
//         ? StoreVerificationStatusEnumUsedByFundRelease.Verified
//         : StoreVerificationStatusEnumUsedByFundRelease.Unverified,
//       storeTier: isVerified ? storeTier : StoreTierEnum.New,
//       businessDaysRequired: rules.businessDaysRequired,
//       deliveryRequired: rules.deliveryRequired,
//       buyerProtectionDays: rules.buyerProtectionDays,
//     },

//     orderPlacedAt,
//     buyerProtectionExpiresAt,
//     scheduledReleaseTime,

//     status: FundReleaseStatus.Pending,

//     conditionsMet: {
//       paymentCleared: true, // true because we have received the payment before creating this fund release
//       paymentClearedAt: new Date(), // If paymentCleared above is changed to false, this should be null or removed
//       verificationComplete: isVerified,
//       deliveryConfirmed: false,
//       buyerProtectionExpired: false,
//       noActiveDisputes: true,
//       noActiveReturns: true,
//       noChargebacks: true,
//     },
//   });

//   await fundRelease.save({ session });
//   return fundRelease;
// }

// /**
//  * Update fund release status when conditions are met
//  */
// export async function updateFundReleaseCondition(
//   fundReleaseId: string,
//   condition: BooleanConditions,
//   value: boolean
// ): Promise<IFundRelease | null> {
//   const FundRelease = await getFundReleaseModel();

//   const fundRelease = await FundRelease.findById(fundReleaseId);
//   if (!fundRelease) return null;

//   // Update the condition
//   fundRelease.conditionsMet[condition] = value;

//   // Set timestamp if condition is being met
//   if (
//     value &&
//     condition === "paymentCleared" &&
//     !fundRelease.conditionsMet.paymentClearedAt
//   ) {
//     fundRelease.conditionsMet.paymentClearedAt = new Date();
//   }
//   if (
//     value &&
//     condition === "deliveryConfirmed" &&
//     !fundRelease.deliveryConfirmedAt
//   ) {
//     fundRelease.deliveryConfirmedAt = new Date();
//   }
//   if (value && condition === "buyerProtectionExpired") {
//     fundRelease.conditionsMet.buyerProtectionExpiresAt =
//       fundRelease.buyerProtectionExpiresAt;
//   }

//   // Check if all conditions are met
//   if (
//     checkAllConditionsMet(fundRelease) &&
//     fundRelease.status === FundReleaseStatus.Pending
//   ) {
//     fundRelease.status = FundReleaseStatus.Ready;
//     fundRelease.trigger =
//       determineFundReleaseTrigger(fundRelease, FundReleaseStatus.Pending) ||
//       undefined;
//   }

//   await fundRelease.save();
//   return fundRelease;
// }

// /**
//  * Process a ready fund release (transfer to wallet)
//  */
// export async function processFundRelease(
//   fundReleaseId: string
//   // transactionReference?: string // will be used later
// ): Promise<{ success: boolean; error?: string }> {
//   const FundRelease = await getFundReleaseModel();
//   const Wallet = await getWalletModel();

//   const fundRelease = await FundRelease.findById(fundReleaseId);
//   if (!fundRelease) {
//     return { success: false, error: "Fund release not found" };
//   }

//   if (fundRelease.status !== FundReleaseStatus.Ready) {
//     return {
//       success: false,
//       error: `Cannot process - status is ${fundRelease.status}`,
//     };
//   }

//   try {
//     // Update fund release to processing
//     fundRelease.status = FundReleaseStatus.Processing;
//     await fundRelease.save();

//     // Update wallet - move from pending to balance
//     const wallet = await Wallet.findById(fundRelease.walletId);
//     if (!wallet) {
//       throw new Error("Wallet not found");
//     }

//     wallet.pending = Math.max(0, (wallet.pending || 0) - fundRelease.amount);
//     wallet.balance = (wallet.balance || 0) + fundRelease.netAmount;
//     await wallet.save();

//     // Mark as released
//     fundRelease.status = FundReleaseStatus.Released;
//     fundRelease.actualReleasedAt = new Date();
//     await fundRelease.save();

//     return { success: true };
//   } catch (error) {
//     fundRelease.status = FundReleaseStatus.Failed;
//     fundRelease.adminNotes = `Error: ${error instanceof Error ? error.message : "Unknown error"}`;
//     await fundRelease.save();

//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error occurred",
//     };
//   }
// }

// /**
//  * Check all pending fund releases and transition ready ones
//  */
// export async function checkAndTransitionFundReleases(): Promise<{
//   checked: number;
//   transitioned: number;
// }> {
//   const FundRelease = await getFundReleaseModel();

//   // Find all pending fund releases
//   const pendingReleases = await FundRelease.find({
//     status: FundReleaseStatus.Pending,
//   });

//   let transitioned = 0;

//   for (const release of pendingReleases) {
//     // Check if scheduled time has passed (for time-based release)
//     if (
//       release.scheduledReleaseTime &&
//       new Date() >= release.scheduledReleaseTime
//     ) {
//       release.conditionsMet.buyerProtectionExpired = true;
//     }

//     // If all conditions met, mark as ready
//     if (checkAllConditionsMet(release)) {
//       release.status = FundReleaseStatus.Ready;
//       release.trigger =
//         determineFundReleaseTrigger(release, FundReleaseStatus.Pending) ||
//         undefined;
//       await release.save();
//       transitioned++;
//     }
//   }

//   return { checked: pendingReleases.length, transitioned };
// }
