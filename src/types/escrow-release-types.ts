import type mongoose from "mongoose";
import type { IStore } from "@/lib/db/models/store.model";
import type { IUser } from "@/lib/db/models/user.model";

/**
 * Type definitions for populated store data in escrow release operations
 *
 * This represents the essential store information needed during escrow release,
 * including wallet reference for crediting funds.
 */
export type PopulatedStoreForRelease = Pick<
  IStore,
  "_id" | "name" | "storeEmail" | "wallet"
>;

/**
 * Type definitions for populated user data in escrow release operations
 *
 * This represents the essential customer information needed for notifications
 * and audit logging during escrow release.
 */
export type PopulatedUserForRelease = Pick<
  IUser,
  "_id" | "firstName" | "lastName" | "email"
>;

/**
 * Interface for escrow release request input
 *
 * Defines the structure of data required to initiate an escrow release,
 * including the sub-order identifier and optional admin notes.
 */
export interface EscrowReleaseInput {
  /**
   * Sub-order ID for which escrow should be released
   *
   * Must be a valid MongoDB ObjectId string representing the specific
   * sub-order that has completed delivery and passed its return window.
   */
  subOrderId: string;

  /**
   * Optional admin notes for the release action
   *
   * Allows administrators to add context or reasoning for the escrow release,
   * which will be included in audit logs for compliance and review purposes.
   */
  notes?: string;
}

/**
 * Interface for the escrow release response
 *
 * Defines the comprehensive response structure returned after successful
 * escrow release, including transaction details and updated balances.
 */
export interface EscrowReleaseResponse {
  success: true;
  message: string;
  release: {
    /**
     * Sub-order and order identification
     */
    subOrderId: string;
    orderId: string;
    orderNumber: string;
    subOrderNumber: string;

    /**
     * Financial details of the release
     */
    amount: number; // Amount released in kobo
    currency: "NGN";
    releasedAt: string; // ISO string timestamp

    /**
     * Seller information
     */
    seller: {
      id: string;
      name: string;
      email: string;
    };

    /**
     * Customer information
     */
    customer: {
      name: string;
      email: string;
    };

    /**
     * Wallet transaction details
     */
    walletTransaction: {
      id: string;
      newBalance: number; // New wallet balance in kobo
    };
  };
}

/**
 * Interface for escrow release eligibility validation
 *
 * Used internally to track and validate all conditions that must be met
 * before an escrow release can be processed.
 */
export interface EscrowEligibilityCheck {
  isEligible: boolean;
  errors: string[];
  checks: {
    escrowHeld: boolean;
    notAlreadyReleased: boolean;
    deliveryConfirmed: boolean;
    returnWindowPassed: boolean;
  };
}

/**
 * Interface for wallet transaction creation
 *
 * Defines the structure for creating wallet transaction records
 * during escrow release operations.
 */
export interface WalletTransactionData {
  wallet: mongoose.Types.ObjectId;
  type: "credit";
  amount: number;
  source: "order";
  description: string;
  relatedOrderId: mongoose.Types.ObjectId;
}

/**
 * Interface for audit log details specific to escrow release
 *
 * Defines the comprehensive audit information that should be logged
 * for every escrow release action for compliance and monitoring.
 */
export interface EscrowReleaseAuditDetails {
  action: "escrow_release";
  subOrderId: string;
  orderId: string;
  amount: number;
  sellerId: string;
  sellerName: string;
  customerEmail: string;
  notes: string | null;
  walletTransactionId: string;
  newWalletBalance: number;
}
