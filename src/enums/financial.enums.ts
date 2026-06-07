/**
 * Enums for the Soraxi financial system.
 *
 * These enums define all valid states, categories, and types
 * used across the ledger, wallets, transactions, payouts, and disputes.
 */

// ---------------------------------------------------------------------------
// Ledger
// ---------------------------------------------------------------------------

/**
 * Direction of a ledger entry.
 */
export enum LedgerEntryType {
  CREDIT = "credit",
  DEBIT = "debit",
}

/**
 * Category of a ledger entry — describes the financial event that triggered it.
 */
export enum LedgerEntryCategory {
  PAYMENT_RECEIVED = "payment_received", // Customer payment collected by platform
  COMMISSION_DEDUCTED = "commission_deducted", // Platform commission taken from suborder
  VENDOR_SETTLEMENT = "vendor_settlement", // Vendor net amount credited to wallet
  FUNDS_HELD = "funds_held", // Funds frozen due to open dispute
  FUNDS_RELEASED = "funds_released", // Frozen or pending funds moved to available
  REFUND_ISSUED = "refund_issued", // Funds returned to customer
  PENALTY_APPLIED = "penalty_applied", // Penalty deducted from vendor wallet
  PAYOUT_INITIATED = "payout_initiated", // Vendor withdrawal request processed
  PAYOUT_COMPLETED = "payout_completed", // Withdrawal successfully sent to bank
  PAYOUT_FAILED = "payout_failed", // Withdrawal attempt failed
  GATEWAY_FEE_DEDUCTED = "gateway_fee_deducted", // Flutterwave charge recorded as platform expense
  DEBT_RECOVERED = "debt_recovered", // Debt repayment from payout
}

/**
 * Entity types that can be referenced in a ledger entry.
 */
export enum LedgerEntityType {
  VENDOR = "vendor", // Represents the store a payment was made to
  PLATFORM = "platform",
  CUSTOMER = "customer", // Represents the user that made the payment
}

/**
 * Document types that can trigger a ledger entry.
 */
export enum LedgerReferenceType {
  SUBORDER = "suborder",
  DISPUTE = "dispute",
  PAYOUT = "payout",
  PENALTY = "penalty",
}

// ---------------------------------------------------------------------------
// Vendor Wallet
// ---------------------------------------------------------------------------

/**
 * Strategy used to recover a negative vendor wallet balance (debt).
 */
export enum DebtRecoveryType {
  PERCENTAGE_DEDUCTION = "percentage_deduction", // Fixed % deducted from future payouts
  FULL_BLOCK = "full_block", // All payouts blocked until debt is cleared
}

// ---------------------------------------------------------------------------
// Transaction Record
// ---------------------------------------------------------------------------

/**
 * Financial status of an individual suborder within a transaction.
 */
export enum SuborderFinancialStatus {
  PENDING = "pending", // Payment received, awaiting order confirmation
  HELD = "held", // Funds frozen due to open dispute
  SETTLED = "settled", // Funds released to vendor's available balance
  DISPUTED = "disputed", // Active dispute in progress
  REFUNDED = "refunded", // Student has been refunded
}

// ---------------------------------------------------------------------------
// Payout Record
// ---------------------------------------------------------------------------

/**
 * Internal status of a payout attempt.
 */
export enum PayoutStatus {
  INITIATED = "initiated", // Payout request created, not yet sent to Flutterwave
  PROCESSING = "processing", // Sent to Flutterwave, awaiting confirmation
  COMPLETED = "completed", // Successfully transferred to vendor bank account
  FAILED = "failed", // Transfer failed — balance has been reversed
}

/**
 * Status returned by Flutterwave for a transfer.
 */
export enum FlutterwaveTransferStatus {
  PENDING = "pending",
  SUCCESSFUL = "successful",
  FAILED = "failed",
}

/**
 * Status returned by Flutterwave for a payment collection.
 */
export enum FlutterwavePaymentStatus {
  PENDING = "pending",
  SUCCESSFUL = "successful",
  FAILED = "failed",
}

// ---------------------------------------------------------------------------
// Dispute Record
// ---------------------------------------------------------------------------

/**
 * Lifecycle status of a dispute.
 */
export enum DisputeStatus {
  OPEN = "open", // Dispute raised, under review
  AWAITING_EVIDENCE = "awaiting_evidence", // Additional evidence requested from student
  RESOLVED = "resolved", // Resolved by platform team
  AUTO_RESOLVED = "auto_resolved", // Resolved automatically after deadline passed
}

/**
 * Final outcome of a resolved dispute.
 */
export enum DisputeOutcome {
  UPHELD = "upheld", // Ruled in favour of student — refund + penalty applied
  REJECTED = "rejected", // Ruled in favour of vendor — funds released
  INCONCLUSIVE = "inconclusive", // Evidence insufficient — additional evidence requested
}

/**
 * Who resolved the dispute.
 */
export enum DisputeResolvedBy {
  PLATFORM_TEAM = "platform_team", // Resolved manually by a team member
  SYSTEM = "system", // Resolved automatically by background job
}
