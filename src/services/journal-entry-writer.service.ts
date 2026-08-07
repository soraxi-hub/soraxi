import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  LedgerEntryType,
  LedgerEntryCategory,
  LedgerEntityType,
  LedgerReferenceType,
  LedgerAccountType,
} from "@/enums/financial.enums";
import {
  createJournalEntry,
  type IJournalEntry,
} from "@/lib/db/models/journal-entry.model";
import {
  createLedgerLines,
  type ILedgerLine,
} from "@/lib/db/models/ledger-line.model";

// ---------------------------------------------------------------------------
// Amount guard
// ---------------------------------------------------------------------------

/**
 * Assert that a value is a valid Kobo amount: a positive integer.
 *
 * All monetary amounts in Soraxi are stored in Kobo (1 Naira = 100 Kobo)
 * as integers to avoid floating-point precision issues. This guard is called
 * on every amount before a journal entry is composed.
 *
 * @param amount - The value to validate
 * @param label - Human-readable label used in the error message
 * @throws {Error} If the value is not a positive integer
 */
export function assertValidKoboAmount(amount: number, label = "amount"): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error(
      `Invalid Kobo amount for "${label}": expected a positive integer, got ${amount}.`,
    );
  }
}

// ---------------------------------------------------------------------------
// Internal types for ledger line construction
// ---------------------------------------------------------------------------

/** A ledger line as it is built inside the writer — before the journal ID is known. */
type PendingLedgerLine = Omit<ILedgerLine, "_id" | "createdAt" | "journalId">;

// ---------------------------------------------------------------------------
// Param types for each composer method
// ---------------------------------------------------------------------------

export interface WriteCollectionFeeParams {
  /** Total Flutterwave collection fee in Kobo (app_fee + VAT). */
  feeAmount: number;
  /** _id of the order this fee relates to. */
  orderId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WritePaymentReceivedParams {
  /** Total gross amount paid by the customer, in Kobo. */
  totalAmount: number;
  /** _id of the order (used as the referenceId). */
  orderId: mongoose.Types.ObjectId;
  /** Flutterwave transaction reference — stored in metadata. */
  flutterwaveReference: string;
  /** The id of the entityType that made the payment */
  entityId: mongoose.Types.ObjectId;
  /** Is it a customer or vendor */
  entityType: LedgerEntityType;
  session: mongoose.ClientSession;
}

export interface WriteOrderSettlementParams {
  /**
   * One entry per vendor suborder.
   * The sum of all settleAmounts + the commission must equal the totalAmount.
   */
  vendorSettlements: {
    vendorId: mongoose.Types.ObjectId;
    settleAmount: number;
    suborderId: mongoose.Types.ObjectId;
  }[];
  /** Total commission earned by the platform across all suborders, in Kobo. */
  totalCommission: number;
  /** Total gross order amount — must equal sum(settleAmounts) + totalCommission. */
  totalAmount: number;
  /** _id of the order. */
  orderId: mongoose.Types.ObjectId;
  /** The id of the entityType that made the payment */
  entityId: mongoose.Types.ObjectId;
  /** Is it a customer or vendor */
  entityType: LedgerEntityType;
  session: mongoose.ClientSession;
}

export interface WriteSuborderSettlementParams {
  /** The vendor (store) this suborder belongs to. */
  vendorId: mongoose.Types.ObjectId;
  /** The vendor's net settle amount for this suborder, in Kobo. */
  settleAmount: number;
  /** Platform commission earned on this suborder, in Kobo. */
  commission: number;
  /**
   * The customer's payment for this suborder, in Kobo.
   * Must equal settleAmount + commission.
   */
  amountPaid: number;
  /** _id of the suborder (used as referenceId). */
  suborderId: mongoose.Types.ObjectId;
  /** The id of the customer that made the payment */
  customerId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WriteDisputeOpenedParams {
  /** The vendor whose funds are being frozen. */
  vendorId: mongoose.Types.ObjectId;
  /** The vendor's net settle amount for this suborder, in Kobo. */
  settleAmount: number;
  /** _id of the dispute document. */
  disputeId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WriteDisputeRejectedParams {
  /** The vendor whose funds are being returned. */
  vendorId: mongoose.Types.ObjectId;
  /** The vendor's net settle amount for this suborder, in Kobo. */
  settleAmount: number;
  /** _id of the dispute document. */
  disputeId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WriteDisputeUpheldParams {
  /** The vendor whose funds are being forfeited. */
  vendorId: mongoose.Types.ObjectId;
  /** The customer this disputed funds belongs to.  */
  customerId: mongoose.Types.ObjectId;
  /**
   * Portion of penaltyAmount drawn from the vendor's available balance.
   * The remainder (penaltyAmount - penaltyFromAvailable) becomes vendor debt.
   * Computed by the caller from the same wallet snapshot used for the clamp.
   */
  penaltyFromAvailable: number;
  /** The frozen settle amount to be refunded to the customer, in Kobo. */
  settleAmount: number;
  /**
   * The platform commission originally earned on this suborder, in Kobo.
   * This is reversed so the student receives the full amountPaid back.
   * settleAmount + commission must equal the original amountPaid.
   */
  commission: number;
  /** The penalty amount deducted from the vendor's available balance, in Kobo. */
  penaltyAmount: number;
  /** _id of the dispute document. */
  disputeId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WriteDisputeAutoResolvedParams {
  /** The vendor whose frozen funds are being refunded to the customer. */
  vendorId: mongoose.Types.ObjectId;
  /** The customer this disputed funds belongs to.  */
  customerId: mongoose.Types.ObjectId;
  /** The frozen settle amount to be refunded to the customer, in Kobo. */
  settleAmount: number;
  /**
   * The platform commission originally earned on this suborder, in Kobo.
   * Reversed so the student receives the full amountPaid back.
   * settleAmount + commission must equal the original amountPaid.
   */
  commission: number;
  /** _id of the dispute document. */
  disputeId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WritePayoutInitiatedParams {
  /** The vendor initiating the withdrawal. */
  vendorId: mongoose.Types.ObjectId;
  /**
   * Net amount moving out of the vendor's available balance and into
   * PAYOUT_PROCESSING (i.e. requestedAmount minus any debt recovery deduction).
   */
  netPayoutAmount: number;
  /** _id of the payout record document. */
  payoutId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WritePayoutCompletedParams {
  /** The vendor who received the payout. */
  vendorId: mongoose.Types.ObjectId;
  /** Net amount transferred to the vendor's bank account, in Kobo. */
  netAmount: number;
  /**
   * Gateway fee charged by Flutterwave for this transfer, in Kobo.
   * Pass 0 if no fee was charged or the platform absorbs it without attribution.
   */
  gatewayFee: number;
  /** _id of the payout record document. */
  payoutId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WritePayoutFailedParams {
  /** The vendor whose payout failed. */
  vendorId: mongoose.Types.ObjectId;
  /** The amount that was in PAYOUT_PROCESSING and must be returned, in Kobo. */
  requestedAmount: number;
  /** _id of the payout record document. */
  payoutId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WriteDebtRecoveryParams {
  /** The vendor from whom the debt is being recovered. */
  vendorId: mongoose.Types.ObjectId;
  /** Amount withheld from the payout to repay debt, in Kobo. */
  recoveredAmount: number;
  /** _id of the payout record document. */
  payoutId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WriteGatewayFeeParams {
  /** Fee charged by Flutterwave, in Kobo. */
  feeAmount: number;
  /** _id of the payout record document. */
  payoutId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WriteFundsReleasedParams {
  /** The vendor whose funds are being released. */
  vendorId: mongoose.Types.ObjectId;
  /** The net settle amount moving from pending to available, in Kobo. */
  settleAmount: number;
  /** _id of the suborder document that triggered this release. */
  suborderId: mongoose.Types.ObjectId;
  /**
   * How the release was triggered — stored in metadata for auditability.
   *
   * `DELIVERY_CODE` covers proof-of-delivery confirmations, whether the code
   * was typed by a rider on the public link or read over the phone and entered
   * by the vendor. Both are buyer-attested; only the keyboard differs, and
   * collapsing them here keeps the ledger's vocabulary about *why* funds moved
   * rather than *which device* was used. The precise method is recorded on the
   * sub-order's `deliveryProof`.
   */
  triggeredBy:
    | "CUSTOMER_CONFIRMATION"
    | "AUTO_CONFIRMATION"
    | "DELIVERY_CODE";
  session: mongoose.ClientSession;
}

export interface WritePayoutProcessingFeeParams {
  /** The vendor paying the processing fee. */
  vendorId: mongoose.Types.ObjectId;
  /**
   * Soraxi's internal processing fee deducted from the payout, in Kobo.
   * This is distinct from the Flutterwave gateway fee — it is Soraxi's own
   * revenue charged for handling the withdrawal.
   */
  processingFee: number;
  /** _id of the payout record document. */
  payoutId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WritePayoutProcessingFeeReversalParams {
  /** The vendor whose processing fee is being reversed. */
  vendorId: mongoose.Types.ObjectId;
  /** The processing fee amount to reverse, in Kobo. */
  processingFee: number;
  /** _id of the payout record document. */
  payoutId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WriteGatewayFeeReversalParams {
  /** Gateway fee amount to reverse, in Kobo. */
  feeAmount: number;
  /** _id of the payout record document. */
  payoutId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WriteOrderCancellationRefundParams {
  /** The vendor whose pending funds are being reversed. */
  vendorId: mongoose.Types.ObjectId;
  /** The customer this pending funds belongs to.  */
  customerId: mongoose.Types.ObjectId;
  /**
   * The vendor's net settle amount for this suborder, in Kobo.
   * Reversed out of VENDOR_PENDING.
   */
  settleAmount: number;
  /**
   * The platform commission earned on this suborder, in Kobo.
   * Reversed out of PLATFORM_REVENUE_COMMISSION since the sale never completed.
   * settleAmount + commission must equal amountPaid.
   */
  commission: number;
  /**
   * The full amount the student paid for this suborder, in Kobo.
   * Must equal settleAmount + commission.
   * This is the amount credited to CUSTOMER_REFUND_PAYABLE.
   */
  amountPaid: number;
  /** _id of the RefundRecord document. */
  refundId: mongoose.Types.ObjectId;
  /** _id of the suborder document — stored in metadata for traceability. */
  suborderId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WriteFailedDeliveryRefundParams {
  /** The vendor whose pending funds are being reversed. */
  vendorId: mongoose.Types.ObjectId;
  /** The customer this pending funds belongs to.  */
  customerId: mongoose.Types.ObjectId;
  /**
   * The vendor's net settle amount for this suborder, in Kobo.
   * This is the amount refunded to the student.
   * Commission is NOT reversed — it stays with Soraxi.
   */
  settleAmount: number;
  /** _id of the RefundRecord document. */
  refundId: mongoose.Types.ObjectId;
  /** _id of the suborder document — stored in metadata for traceability. */
  suborderId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WriteRefundConfirmedParams {
  /** The customer this returned funds belongs to.  */
  customerId: mongoose.Types.ObjectId;
  /**
   * The amount Flutterwave confirmed was disbursed to the customer, in Kobo.
   * Closes the CUSTOMER_REFUND_PAYABLE liability and reduces PLATFORM_ESCROW.
   */
  amountRefunded: number;
  /** _id of the RefundRecord document. */
  refundId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

// ---------------------------------------------------------------------------
// JournalEntryWriter
// ---------------------------------------------------------------------------

/**
 * The sole authorised writer of journal entries and ledger lines.
 *
 * No other service, repository, or API route is permitted to write directly
 * to the `JournalEntry` or `LedgerLine` collections.
 *
 * Every write method on this service:
 * 1. Validates all amounts are positive Kobo integers.
 * 2. Asserts the double-entry invariant (sum of credits === sum of debits)
 *    before touching the database.
 * 3. Writes the `JournalEntry` document first.
 * 4. Writes all `LedgerLine` documents in the same MongoDB session.
 * 5. Throws and rolls back if any step fails.
 */
export class JournalEntryWriter {
  private constructor() {}

  /**
   * Initialise the JournalEntryWriter service.
   * Ensures the database connection is established before any method is called.
   *
   * @returns A ready-to-use JournalEntryWriter instance
   */
  static async init(): Promise<JournalEntryWriter> {
    await connectToDatabase();
    return new JournalEntryWriter();
  }

  // -------------------------------------------------------------------------
  // Private helpers
  // -------------------------------------------------------------------------

  /**
   * Assert that the proposed ledger lines are balanced — total credits must
   * equal total debits. Throws before any DB write if the invariant is violated.
   *
   * @param lines - The pending ledger lines to validate
   * @throws {Error} If credits do not equal debits
   */
  private assertBalanced(lines: PendingLedgerLine[]): void {
    const totalCredits = lines
      .filter((l) => l.type === LedgerEntryType.CREDIT)
      .reduce((sum, l) => sum + l.amount, 0);

    const totalDebits = lines
      .filter((l) => l.type === LedgerEntryType.DEBIT)
      .reduce((sum, l) => sum + l.amount, 0);

    if (totalCredits !== totalDebits) {
      throw new Error(
        `Double-entry invariant violated: credits (${totalCredits}) !== debits (${totalDebits}). ` +
          `No journal entry was written.`,
      );
    }
  }

  /**
   * Write a balanced journal entry and its ledger lines atomically.
   *
   * This is the single internal path through which all journal entries are
   * persisted. It:
   * 1. Validates balance (credits === debits).
   * 2. Creates the JournalEntry document.
   * 3. Attaches the journalId to every line and bulk-inserts them.
   *
   * @param journalData - The journal entry header data
   * @param lines - The pre-validated pending ledger lines
   * @param session - MongoDB client session (always required)
   * @returns The created journal entry document
   */
  private async commitEntry(
    journalData: Omit<IJournalEntry, "_id" | "createdAt">,
    lines: PendingLedgerLine[],
    session: mongoose.ClientSession,
  ): Promise<void> {
    // Guard: invariant check before any DB write
    this.assertBalanced(lines);

    // Write the journal entry header first
    const journal = await createJournalEntry(journalData, session);

    // Attach journalId to every line and persist atomically
    const linesWithJournalId = lines.map((line) => ({
      ...line,
      journalId: journal._id,
    }));

    await createLedgerLines(linesWithJournalId, session);
  }

  // -------------------------------------------------------------------------
  // Composer methods
  // -------------------------------------------------------------------------

  async writeCollectionFee(params: WriteCollectionFeeParams): Promise<void> {
    const { feeAmount, orderId, session } = params;

    assertValidKoboAmount(feeAmount, "feeAmount");

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.GATEWAY_FEES_EXPENSE,
        amount: feeAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.PLATFORM_ESCROW,
        amount: feeAmount,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.GATEWAY_FEE_DEDUCTED,
        referenceType: LedgerReferenceType.SUBORDER,
        referenceId: orderId,
        description: `Flutterwave collection fee of ${feeAmount} Kobo deducted from escrow for order ${orderId}`,
        metadata: { orderId, feeAmount, feeType: "COLLECTION" },
      },
      lines,
      session,
    );
  }

  /**
   * Record a confirmed customer payment entering the platform's escrow.
   *
   * Journal entry:
   *   DEBIT   PLATFORM_ESCROW         totalAmount
   *   CREDIT  CUSTOMER_REFUND_PAYABLE totalAmount
   *
   * The DEBIT on PLATFORM_ESCROW records that the platform is now holding the
   * funds. The CREDIT on CUSTOMER_REFUND_PAYABLE records the corresponding
   * liability — the platform owes this money back until the order is settled
   * or refunded.
   *
   * @param params - Payment received parameters
   */
  async writePaymentReceived(
    params: WritePaymentReceivedParams,
  ): Promise<void> {
    const {
      totalAmount,
      orderId,
      flutterwaveReference,
      session,
      entityId,
      entityType,
    } = params;

    assertValidKoboAmount(totalAmount, "totalAmount");

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.PLATFORM_ESCROW,
        amount: totalAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.CUSTOMER_REFUND_PAYABLE,
        entityId,
        entityType,
        amount: totalAmount,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.PAYMENT_RECEIVED,
        referenceType: LedgerReferenceType.SUBORDER,
        referenceId: orderId,
        description: `Customer payment received for order ${orderId}`,
        metadata: { flutterwaveReference, orderId },
      },
      lines,
      session,
    );
  }

  /**
   * Record the settlement of a confirmed order — escrow is split between
   * each vendor's pending balance and the platform's commission revenue.
   *
   * Journal entry (multi-vendor example):
   *   DEBIT   CUSTOMER_REFUND_PAYABLE        totalAmount
   *   CREDIT  VENDOR_PENDING (per vendor)    settleAmount  [one line per vendor]
   *   CREDIT  PLATFORM_REVENUE_COMMISSION    totalCommission
   *
   * The DEBIT closes the CUSTOMER_REFUND_PAYABLE liability created in
   * writePaymentReceived. The sum of all vendor CREDIT lines plus the
   * commission CREDIT must equal the DEBIT amount.
   *
   * @param params - Order settlement parameters
   * @throws {Error} If settlement amounts do not sum to totalAmount
   * @deprecated
   */
  async writeOrderSettlement(
    params: WriteOrderSettlementParams,
  ): Promise<void> {
    const {
      vendorSettlements,
      totalCommission,
      totalAmount,
      orderId,
      session,
      entityId,
      entityType,
    } = params;

    assertValidKoboAmount(totalAmount, "totalAmount");
    assertValidKoboAmount(totalCommission, "totalCommission");
    vendorSettlements.forEach(({ settleAmount, vendorId }, i) => {
      assertValidKoboAmount(
        settleAmount,
        `vendorSettlements[${i}].settleAmount`,
      );
      if (!vendorId) {
        throw new Error(`vendorSettlements[${i}].vendorId is required.`);
      }
    });

    // Verify that the amounts reconcile before constructing lines
    const totalSettleAmount = vendorSettlements.reduce(
      (sum, v) => sum + v.settleAmount,
      0,
    );
    if (totalSettleAmount + totalCommission !== totalAmount) {
      throw new Error(
        `ORDER_SETTLED amounts do not reconcile: ` +
          `sum(settleAmounts)=${totalSettleAmount} + commission=${totalCommission} ` +
          `!== totalAmount=${totalAmount}.`,
      );
    }

    const lines: PendingLedgerLine[] = [
      // Close the escrow liability
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.CUSTOMER_REFUND_PAYABLE,
        entityId,
        entityType,
        amount: totalAmount,
      },
      // One CREDIT line per vendor — each with their own entityId
      ...vendorSettlements.map(({ vendorId, settleAmount }) => ({
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.VENDOR_PENDING,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: settleAmount,
      })),
      // Platform earns the commission
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.PLATFORM_REVENUE_COMMISSION,
        amount: totalCommission,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.VENDOR_SETTLEMENT,
        referenceType: LedgerReferenceType.SUBORDER,
        referenceId: orderId,
        description: `Order ${orderId} confirmed — escrow released to vendors and platform`,
        metadata: {
          orderId,
          totalCommission,
          vendorCount: vendorSettlements.length,
        },
      },
      lines,
      session,
    );
  }

  /**
   * Record settlement of a single confirmed suborder. One balanced entry per
   * suborder, so referenceId points at the suborder and per-suborder commission
   * stays derivable from the ledger.
   *
   * Journal entry:
   *   DEBIT   CUSTOMER_REFUND_PAYABLE       amountPaid   (closes this suborder's share of escrow liability)
   *   CREDIT  VENDOR_PENDING                settleAmount
   *   CREDIT  PLATFORM_REVENUE_COMMISSION   commission
   *
   * Summed across all suborders, the DEBITs close exactly the REFUND_PAYABLE
   * opened by writePaymentReceived for the order gross.
   *
   * @param params - Suborder settlement parameters
   * @throws {Error} If settleAmount + commission !== amountPaid
   */
  async writeSuborderSettlement(
    params: WriteSuborderSettlementParams,
  ): Promise<void> {
    const {
      vendorId,
      settleAmount,
      commission,
      amountPaid,
      suborderId,
      session,
      customerId,
    } = params;

    assertValidKoboAmount(settleAmount, "settleAmount");
    assertValidKoboAmount(commission, "commission");
    assertValidKoboAmount(amountPaid, "amountPaid");

    if (settleAmount + commission !== amountPaid) {
      throw new Error(
        `writeSuborderSettlement: settleAmount (${settleAmount}) + commission (${commission}) ` +
          `!== amountPaid (${amountPaid}). Amounts do not reconcile.`,
      );
    }

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.CUSTOMER_REFUND_PAYABLE,
        entityId: customerId,
        entityType: LedgerEntityType.CUSTOMER,
        amount: amountPaid,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.VENDOR_PENDING,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: settleAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.PLATFORM_REVENUE_COMMISSION,
        amount: commission,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.VENDOR_SETTLEMENT,
        referenceType: LedgerReferenceType.SUBORDER,
        referenceId: suborderId,
        description: `Suborder ${suborderId} settled — ${settleAmount} Kobo to vendor ${vendorId}, ${commission} Kobo commission`,
        metadata: {
          vendorId,
          suborderId,
          settleAmount,
          commission,
          amountPaid,
        },
      },
      lines,
      session,
    );
  }

  /**
   * Freeze a vendor's available funds when a dispute opens. Funds are always in
   * available at this point, since disputes can only be raised after the
   * customer confirms receipt.
   *
   * Journal entry:
   *   DEBIT   VENDOR_AVAILABLE   settleAmount
   *   CREDIT  VENDOR_DISPUTED    settleAmount
   */
  async writeDisputeOpened(params: WriteDisputeOpenedParams): Promise<void> {
    const { vendorId, settleAmount, disputeId, session } = params;

    assertValidKoboAmount(settleAmount, "settleAmount");

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.VENDOR_AVAILABLE,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: settleAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.VENDOR_DISPUTED,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: settleAmount,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.FUNDS_HELD,
        referenceType: LedgerReferenceType.DISPUTE,
        referenceId: disputeId,
        description: `Funds frozen for dispute ${disputeId} — vendor ${vendorId}`,
        metadata: { vendorId, disputeId },
      },
      lines,
      session,
    );
  }

  /**
   * Return frozen funds to a vendor when a dispute is rejected. Reverses
   * writeDisputeOpened.
   *
   * Journal entry:
   *   DEBIT   VENDOR_DISPUTED    settleAmount
   *   CREDIT  VENDOR_AVAILABLE   settleAmount
   */
  async writeDisputeRejected(
    params: WriteDisputeRejectedParams,
  ): Promise<void> {
    const { vendorId, settleAmount, disputeId, session } = params;

    assertValidKoboAmount(settleAmount, "settleAmount");

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.VENDOR_DISPUTED,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: settleAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.VENDOR_AVAILABLE,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: settleAmount,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.FUNDS_RELEASED,
        referenceType: LedgerReferenceType.DISPUTE,
        referenceId: disputeId,
        description: `Dispute ${disputeId} rejected — frozen funds returned to vendor ${vendorId}`,
        metadata: { vendorId, disputeId },
      },
      lines,
      session,
    );
  }

  /**
   * Record an upheld dispute: full refund of amountPaid to the customer (settle
   * plus commission reversed) and a penalty recognised as platform revenue.
   *
   * The penalty debit splits so available never goes below zero: the covered
   * portion comes from VENDOR_AVAILABLE, the shortfall becomes VENDOR_DEBT_RECEIVABLE.
   *
   *   Pair 1:  DEBIT VENDOR_DISPUTED settle / CREDIT CUSTOMER_REFUND_PAYABLE settle
   *   Pair 2:  DEBIT PLATFORM_REVENUE_COMMISSION commission / CREDIT CUSTOMER_REFUND_PAYABLE commission
   *   Pair 3:  DEBIT VENDOR_AVAILABLE covered (+ DEBIT VENDOR_DEBT_RECEIVABLE shortfall)
   *            / CREDIT PLATFORM_REVENUE_PENALTIES penaltyAmount
   */
  async writeDisputeUpheld(params: WriteDisputeUpheldParams): Promise<void> {
    const {
      vendorId,
      customerId,
      settleAmount,
      commission,
      penaltyAmount,
      penaltyFromAvailable,
      disputeId,
      session,
    } = params;

    assertValidKoboAmount(settleAmount, "settleAmount");
    assertValidKoboAmount(commission, "commission");
    assertValidKoboAmount(penaltyAmount, "penaltyAmount");

    if (
      !Number.isInteger(penaltyFromAvailable) ||
      penaltyFromAvailable < 0 ||
      penaltyFromAvailable > penaltyAmount
    ) {
      throw new Error(
        `Invalid penaltyFromAvailable: expected an integer in [0, ${penaltyAmount}], got ${penaltyFromAvailable}.`,
      );
    }

    const penaltyToDebt = penaltyAmount - penaltyFromAvailable;
    const amountPaid = settleAmount + commission;

    const lines: PendingLedgerLine[] = [
      // Pair 1: frozen disputed funds become a refund liability
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.VENDOR_DISPUTED,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: settleAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.CUSTOMER_REFUND_PAYABLE,
        entityId: customerId,
        entityType: LedgerEntityType.CUSTOMER,
        amount: settleAmount,
      },
      // Pair 2: commission reversed so student gets full amountPaid back
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.PLATFORM_REVENUE_COMMISSION,
        amount: commission,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.CUSTOMER_REFUND_PAYABLE,
        entityId: customerId,
        entityType: LedgerEntityType.CUSTOMER,
        amount: commission,
      },
      // Pair 3: penalty recognised as revenue, debit split between available and debt
      ...(penaltyFromAvailable > 0
        ? [
            {
              type: LedgerEntryType.DEBIT,
              accountType: LedgerAccountType.VENDOR_AVAILABLE,
              entityId: vendorId,
              entityType: LedgerEntityType.VENDOR,
              amount: penaltyFromAvailable,
            } as PendingLedgerLine,
          ]
        : []),
      ...(penaltyToDebt > 0
        ? [
            {
              type: LedgerEntryType.DEBIT,
              accountType: LedgerAccountType.VENDOR_DEBT_RECEIVABLE,
              entityId: vendorId,
              entityType: LedgerEntityType.VENDOR,
              amount: penaltyToDebt,
            } as PendingLedgerLine,
          ]
        : []),
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.PLATFORM_REVENUE_PENALTIES,
        amount: penaltyAmount,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.REFUND_ISSUED,
        referenceType: LedgerReferenceType.DISPUTE,
        referenceId: disputeId,
        description:
          `Dispute ${disputeId} upheld: refund of ${amountPaid} Kobo to customer, ` +
          `penalty ${penaltyAmount} Kobo (${penaltyFromAvailable} from available, ${penaltyToDebt} to debt) on vendor ${vendorId}`,
        metadata: {
          vendorId,
          disputeId,
          settleAmount,
          commission,
          amountPaid,
          penaltyAmount,
          penaltyFromAvailable,
          penaltyToDebt,
        },
      },
      lines,
      session,
    );
  }

  /**
   * Record a system-triggered auto-resolution of an overdue dispute.
   *
   * Financially identical to writeDisputeUpheld in terms of the refund amount
   * — the student receives the full amountPaid back (settle + commission reversed).
   * However NO penalty is applied to the vendor — the platform team failed to
   * resolve the dispute in time, so the vendor is not penalised for the team's
   * inaction.
   *
   * This produces four ledger lines sharing one journal entry (two balanced pairs):
   *
   *   Pair 1 — Frozen settle amount becomes a refund liability:
   *     DEBIT   VENDOR_DISPUTED               settleAmount
   *     CREDIT  CUSTOMER_REFUND_PAYABLE       settleAmount
   *
   *   Pair 2 — Commission reversed into refund liability:
   *     DEBIT   PLATFORM_REVENUE_COMMISSION   commission
   *     CREDIT  CUSTOMER_REFUND_PAYABLE       commission
   *
   * Total CUSTOMER_REFUND_PAYABLE credit = settleAmount + commission = amountPaid.
   *
   * @param params - Dispute auto-resolved parameters
   */
  async writeDisputeAutoResolved(
    params: WriteDisputeAutoResolvedParams,
  ): Promise<void> {
    const {
      vendorId,
      settleAmount,
      commission,
      disputeId,
      session,
      customerId,
    } = params;

    assertValidKoboAmount(settleAmount, "settleAmount");
    assertValidKoboAmount(commission, "commission");

    const amountPaid = settleAmount + commission;

    const lines: PendingLedgerLine[] = [
      // Pair 1: frozen disputed funds become a refund liability
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.VENDOR_DISPUTED,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: settleAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.CUSTOMER_REFUND_PAYABLE,
        entityId: customerId,
        entityType: LedgerEntityType.CUSTOMER,
        amount: settleAmount,
      },
      // Pair 2: platform commission reversed — student gets full amountPaid back
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.PLATFORM_REVENUE_COMMISSION,
        amount: commission,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.CUSTOMER_REFUND_PAYABLE,
        entityId: customerId,
        entityType: LedgerEntityType.CUSTOMER,
        amount: commission,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.REFUND_ISSUED,
        referenceType: LedgerReferenceType.DISPUTE,
        referenceId: disputeId,
        description:
          `Dispute ${disputeId} auto-resolved — full refund of ${amountPaid} Kobo (settle: ${settleAmount}, commission: ${commission}) ` +
          `issued to customer. No penalty applied: platform team failed to resolve within the deadline.`,
        metadata: {
          vendorId,
          disputeId,
          settleAmount,
          commission,
          amountPaid,
          penaltyAmount: 0,
          triggeredBy: "SYSTEM_AUTO_RESOLUTION",
        },
      },
      lines,
      session,
    );
  }

  /**
   * Record a vendor cancellation refund — the full amountPaid is returned to
   * the student because the vendor chose not to fulfil the order.
   *
   * Funds are still in VENDOR_PENDING at this stage (cancellation is only
   * possible from OrderPlaced or Processing, before delivery confirmation).
   * The commission that was credited to the platform at order settlement is
   * reversed since the sale never completed.
   *
   * Journal entry (three balanced pairs in one entry):
   *
   *   Pair 1 — Vendor pending funds reversed:
   *     DEBIT   VENDOR_PENDING                settleAmount
   *     CREDIT  CUSTOMER_REFUND_PAYABLE       settleAmount
   *
   *   Pair 2 — Commission reversed:
   *     DEBIT   PLATFORM_REVENUE_COMMISSION   commission
   *     CREDIT  CUSTOMER_REFUND_PAYABLE       commission
   *
   * Total CUSTOMER_REFUND_PAYABLE credit = settleAmount + commission = amountPaid.
   *
   * Caller must also:
   *   - Subtract settleAmount from vendor wallet pending and total
   *   - Subtract commission from platform wallet commission balance
   *   - Update TransactionRecord suborder status → REFUNDED
   *
   * @param params - Order cancellation refund parameters
   */
  async writeOrderCancellationRefund(
    params: WriteOrderCancellationRefundParams,
  ): Promise<void> {
    const {
      vendorId,
      customerId,
      settleAmount,
      commission,
      amountPaid,
      refundId,
      suborderId,
      session,
    } = params;

    assertValidKoboAmount(settleAmount, "settleAmount");
    assertValidKoboAmount(commission, "commission");
    assertValidKoboAmount(amountPaid, "amountPaid");

    // Guard: amounts must reconcile
    if (settleAmount + commission !== amountPaid) {
      throw new Error(
        `writeOrderCancellationRefund: settleAmount (${settleAmount}) + commission (${commission}) ` +
          `!== amountPaid (${amountPaid}). Amounts do not reconcile.`,
      );
    }

    const lines: PendingLedgerLine[] = [
      // Pair 1: vendor pending funds reversed into refund liability
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.VENDOR_PENDING,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: settleAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.CUSTOMER_REFUND_PAYABLE,
        entityId: customerId,
        entityType: LedgerEntityType.CUSTOMER,
        amount: settleAmount,
      },
      // Pair 2: commission reversed — platform gives back what it earned
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.PLATFORM_REVENUE_COMMISSION,
        amount: commission,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.CUSTOMER_REFUND_PAYABLE,
        entityId: customerId,
        entityType: LedgerEntityType.CUSTOMER,
        amount: commission,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.ORDER_CANCELLATION_REFUND,
        referenceType: LedgerReferenceType.REFUND,
        referenceId: refundId,
        description:
          `Order cancellation refund of ${amountPaid} Kobo (settle: ${settleAmount}, commission: ${commission}) ` +
          `issued to customer for suborder ${suborderId} — vendor ${vendorId} cancelled`,
        metadata: {
          vendorId,
          suborderId,
          refundId,
          settleAmount,
          commission,
          amountPaid,
        },
      },
      lines,
      session,
    );
  }

  /**
   * Record a failed delivery refund — the vendor's settle amount is returned
   * to the student. The platform commission is NOT reversed; it stays with
   * Soraxi since the vendor attempted delivery and the failure may be due to
   * the student's unavailability.
   *
   * Funds are still in VENDOR_PENDING at this stage (FailedDelivery fires at
   * OutForDelivery, before the customer confirms receipt or auto-confirm runs).
   *
   * Journal entry:
   *   DEBIT   VENDOR_PENDING              settleAmount
   *   CREDIT  CUSTOMER_REFUND_PAYABLE     settleAmount
   *
   * Caller must also:
   *   - Subtract settleAmount from vendor wallet pending and total
   *   - Update TransactionRecord suborder status → REFUNDED
   *
   * @param params - Failed delivery refund parameters
   */
  async writeFailedDeliveryRefund(
    params: WriteFailedDeliveryRefundParams,
  ): Promise<void> {
    const {
      vendorId,
      customerId,
      settleAmount,
      refundId,
      suborderId,
      session,
    } = params;

    assertValidKoboAmount(settleAmount, "settleAmount");

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.VENDOR_PENDING,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: settleAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.CUSTOMER_REFUND_PAYABLE,
        entityId: customerId,
        entityType: LedgerEntityType.CUSTOMER,
        amount: settleAmount,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.FAILED_DELIVERY_REFUND,
        referenceType: LedgerReferenceType.REFUND,
        referenceId: refundId,
        description:
          `Failed delivery refund of ${settleAmount} Kobo issued to customer for suborder ${suborderId} ` +
          `— vendor ${vendorId} marked delivery as failed. Commission retained by platform.`,
        metadata: { vendorId, suborderId, refundId, settleAmount },
      },
      lines,
      session,
    );
  }

  /**
   * Close the CUSTOMER_REFUND_PAYABLE liability once Flutterwave confirms
   * the refund has been disbursed to the customer.
   *
   * This entry fires for all refund triggers (ORDER_CANCELLED, FAILED_DELIVERY,
   * DISPUTE_UPHELD) — both via the automated Flutterwave webhook and via the
   * manual admin confirmation path.
   *
   * Journal entry:
   *   DEBIT   CUSTOMER_REFUND_PAYABLE   amountRefunded
   *   CREDIT  PLATFORM_ESCROW           amountRefunded
   *
   * The DEBIT closes the liability opened by the trigger-specific refund entry.
   * The CREDIT reduces PLATFORM_ESCROW to reflect that the funds have
   * physically left the platform back to the customer.
   *
   * @param params - Refund confirmed parameters
   */
  async writeRefundConfirmed(
    params: WriteRefundConfirmedParams,
  ): Promise<void> {
    const { customerId, amountRefunded, refundId, session } = params;

    assertValidKoboAmount(amountRefunded, "amountRefunded");

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.CUSTOMER_REFUND_PAYABLE,
        entityId: customerId,
        entityType: LedgerEntityType.CUSTOMER,
        amount: amountRefunded,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.PLATFORM_ESCROW,
        amount: amountRefunded,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.REFUND_CONFIRMED,
        referenceType: LedgerReferenceType.REFUND,
        referenceId: refundId,
        description:
          `Refund confirmed by Flutterwave — ${amountRefunded} Kobo disbursed to customer. ` +
          `CUSTOMER_REFUND_PAYABLE liability closed.`,
        metadata: { refundId, amountRefunded },
      },
      lines,
      session,
    );
  }

  /**
   * Move available funds into the in-flight PAYOUT_PROCESSING account on a
   * withdrawal request. netPayoutAmount is already net of any debt recovery.
   *
   * Journal entry:
   *   DEBIT   VENDOR_AVAILABLE    netPayoutAmount
   *   CREDIT  PAYOUT_PROCESSING   netPayoutAmount
   */
  async writePayoutInitiated(
    params: WritePayoutInitiatedParams,
  ): Promise<void> {
    const { vendorId, netPayoutAmount, payoutId, session } = params;

    assertValidKoboAmount(netPayoutAmount, "netPayoutAmount");

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.VENDOR_AVAILABLE,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: netPayoutAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.PAYOUT_PROCESSING,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: netPayoutAmount,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.PAYOUT_INITIATED,
        referenceType: LedgerReferenceType.PAYOUT,
        referenceId: payoutId,
        description: `Payout ${payoutId} initiated — ${netPayoutAmount} Kobo in transit for vendor ${vendorId}`,
        metadata: { vendorId, payoutId, netPayoutAmount },
      },
      lines,
      session,
    );
  }

  /**
   * Complete a payout. Closes PAYOUT_PROCESSING for the net that entered it at
   * initiation, recognises the transfer fee as an expense, and reduces escrow
   * by the total cash that left the platform (net + fee).
   *
   * Journal entry (with gateway fee):
   *   DEBIT   PAYOUT_PROCESSING     netAmount
   *   DEBIT   GATEWAY_FEES_EXPENSE  gatewayFee
   *   CREDIT  PLATFORM_ESCROW       netAmount + gatewayFee
   *
   * Journal entry (no gateway fee):
   *   DEBIT   PAYOUT_PROCESSING   netAmount
   *   CREDIT  PLATFORM_ESCROW     netAmount
   */
  async writePayoutCompleted(
    params: WritePayoutCompletedParams,
  ): Promise<void> {
    const { vendorId, netAmount, gatewayFee, payoutId, session } = params;

    assertValidKoboAmount(netAmount, "netAmount");

    if (!Number.isInteger(gatewayFee) || gatewayFee < 0) {
      throw new Error(
        `Invalid gatewayFee: expected a non-negative integer in Kobo, got ${gatewayFee}.`,
      );
    }

    const totalCashOut = netAmount + gatewayFee;

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.PAYOUT_PROCESSING,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: netAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.PLATFORM_ESCROW,
        amount: totalCashOut,
      },
      ...(gatewayFee > 0
        ? [
            {
              type: LedgerEntryType.DEBIT,
              accountType: LedgerAccountType.GATEWAY_FEES_EXPENSE,
              amount: gatewayFee,
            } as PendingLedgerLine,
          ]
        : []),
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.PAYOUT_COMPLETED,
        referenceType: LedgerReferenceType.PAYOUT,
        referenceId: payoutId,
        description:
          `Payout ${payoutId} completed — ${netAmount} Kobo transferred to vendor ${vendorId}` +
          (gatewayFee > 0 ? ` (gateway fee: ${gatewayFee} Kobo)` : ""),
        metadata: { vendorId, payoutId, netAmount, gatewayFee },
      },
      lines,
      session,
    );
  }

  /**
   * Reverse a failed payout — restore the vendor's available balance.
   *
   * Journal entry:
   *   DEBIT   PAYOUT_PROCESSING   requestedAmount
   *   CREDIT  VENDOR_AVAILABLE    requestedAmount
   */
  async writePayoutFailed(params: WritePayoutFailedParams): Promise<void> {
    const { vendorId, requestedAmount, payoutId, session } = params;

    assertValidKoboAmount(requestedAmount, "requestedAmount");

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.PAYOUT_PROCESSING,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: requestedAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.VENDOR_AVAILABLE,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: requestedAmount,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.PAYOUT_FAILED,
        referenceType: LedgerReferenceType.PAYOUT,
        referenceId: payoutId,
        description: `Payout ${payoutId} failed — ${requestedAmount} Kobo reversed to vendor ${vendorId}`,
        metadata: { vendorId, payoutId, requestedAmount },
      },
      lines,
      session,
    );
  }

  /**
   * Collect vendor debt withheld from a payout. The penalty was already
   * recognised as revenue at upheld time, so recovery only moves the vendor's
   * available funds against the outstanding receivable.
   *
   * Journal entry:
   *   DEBIT   VENDOR_AVAILABLE          recoveredAmount
   *   CREDIT  VENDOR_DEBT_RECEIVABLE    recoveredAmount
   */
  async writeDebtRecovery(params: WriteDebtRecoveryParams): Promise<void> {
    const { vendorId, recoveredAmount, payoutId, session } = params;

    assertValidKoboAmount(recoveredAmount, "recoveredAmount");

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.VENDOR_AVAILABLE,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: recoveredAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.VENDOR_DEBT_RECEIVABLE,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: recoveredAmount,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.DEBT_RECOVERED,
        referenceType: LedgerReferenceType.PAYOUT,
        referenceId: payoutId,
        description: `Debt recovery of ${recoveredAmount} Kobo withheld from payout ${payoutId} for vendor ${vendorId}`,
        metadata: { vendorId, payoutId, recoveredAmount },
      },
      lines,
      session,
    );
  }

  /**
   * Record a Flutterwave transfer fee as a standalone platform expense.
   *
   * Journal entry:
   *   DEBIT   GATEWAY_FEES_EXPENSE   feeAmount
   *   CREDIT  PLATFORM_ESCROW        feeAmount
   *
   * @param params - Gateway fee parameters
   */
  async writeGatewayFee(params: WriteGatewayFeeParams): Promise<void> {
    const { feeAmount, payoutId, session } = params;

    assertValidKoboAmount(feeAmount, "feeAmount");

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.GATEWAY_FEES_EXPENSE,
        amount: feeAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.PLATFORM_ESCROW,
        amount: feeAmount,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.GATEWAY_FEE_DEDUCTED,
        referenceType: LedgerReferenceType.PAYOUT,
        referenceId: payoutId,
        description: `Gateway fee of ${feeAmount} Kobo recorded for payout ${payoutId}`,
        metadata: { payoutId, feeAmount },
      },
      lines,
      session,
    );
  }

  /**
   * Release a vendor's pending funds to available on confirmed delivery.
   *
   * Journal entry:
   *   DEBIT   VENDOR_PENDING     settleAmount
   *   CREDIT  VENDOR_AVAILABLE   settleAmount
   */
  async writeFundsReleased(params: WriteFundsReleasedParams): Promise<void> {
    const { vendorId, settleAmount, suborderId, triggeredBy, session } = params;

    assertValidKoboAmount(settleAmount, "settleAmount");

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.VENDOR_PENDING,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: settleAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.VENDOR_AVAILABLE,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: settleAmount,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.FUNDS_RELEASED,
        referenceType: LedgerReferenceType.SUBORDER,
        referenceId: suborderId,
        description: `Pending funds of ${settleAmount} Kobo released to available for vendor ${vendorId} on suborder ${suborderId}`,
        metadata: { vendorId, suborderId, triggeredBy },
      },
      lines,
      session,
    );
  }

  /**
   * Record Soraxi's internal processing fee deducted from a vendor payout.
   *
   * Journal entry:
   *   DEBIT   VENDOR_AVAILABLE              processingFee
   *   CREDIT  PLATFORM_REVENUE_COMMISSION   processingFee
   *
   * @param params - Payout processing fee parameters
   */
  async writePayoutProcessingFee(
    params: WritePayoutProcessingFeeParams,
  ): Promise<void> {
    const { vendorId, processingFee, payoutId, session } = params;

    assertValidKoboAmount(processingFee, "processingFee");

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.VENDOR_AVAILABLE,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: processingFee,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.PLATFORM_REVENUE_COMMISSION,
        amount: processingFee,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.COMMISSION_DEDUCTED,
        referenceType: LedgerReferenceType.PAYOUT,
        referenceId: payoutId,
        description: `Payout processing fee of ${processingFee} Kobo deducted from vendor ${vendorId} for payout ${payoutId}`,
        metadata: { vendorId, payoutId, processingFee },
      },
      lines,
      session,
    );
  }

  /**
   * Reverse Soraxi's internal processing fee when a payout fails.
   *
   * Journal entry:
   *   DEBIT   PLATFORM_REVENUE_COMMISSION   processingFee
   *   CREDIT  VENDOR_AVAILABLE              processingFee
   *
   * @param params - Payout processing fee reversal parameters
   */
  async writePayoutProcessingFeeReversal(
    params: WritePayoutProcessingFeeReversalParams,
  ): Promise<void> {
    const { vendorId, processingFee, payoutId, session } = params;

    assertValidKoboAmount(processingFee, "processingFee");

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.PLATFORM_REVENUE_COMMISSION,
        amount: processingFee,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.VENDOR_AVAILABLE,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: processingFee,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.PAYOUT_FAILED,
        referenceType: LedgerReferenceType.PAYOUT,
        referenceId: payoutId,
        description: `Processing fee reversal of ${processingFee} Kobo returned to vendor ${vendorId} — payout ${payoutId} failed`,
        metadata: { vendorId, payoutId, processingFee, reversal: true },
      },
      lines,
      session,
    );
  }

  /**
   * Reverse a Flutterwave gateway fee when a payout fails.
   *
   * Journal entry:
   *   DEBIT   PLATFORM_ESCROW        feeAmount
   *   CREDIT  GATEWAY_FEES_EXPENSE   feeAmount
   *
   * @param params - Gateway fee reversal parameters
   */
  async writeGatewayFeeReversal(
    params: WriteGatewayFeeReversalParams,
  ): Promise<void> {
    const { feeAmount, payoutId, session } = params;

    assertValidKoboAmount(feeAmount, "feeAmount");

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.PLATFORM_ESCROW,
        amount: feeAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.GATEWAY_FEES_EXPENSE,
        amount: feeAmount,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.PAYOUT_FAILED,
        referenceType: LedgerReferenceType.PAYOUT,
        referenceId: payoutId,
        description: `Gateway fee reversal of ${feeAmount} Kobo — payout ${payoutId} failed`,
        metadata: { payoutId, feeAmount, reversal: true },
      },
      lines,
      session,
    );
  }
}
