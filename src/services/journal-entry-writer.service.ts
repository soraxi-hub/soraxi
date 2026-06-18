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

export interface WritePaymentReceivedParams {
  /** Total gross amount paid by the customer, in Kobo. */
  totalAmount: number;
  /** _id of the order (used as the referenceId). */
  orderId: mongoose.Types.ObjectId;
  /** Flutterwave transaction reference — stored in metadata. */
  flutterwaveReference: string;
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
  /** The frozen settle amount to be refunded to the customer, in Kobo. */
  settleAmount: number;
  /** The penalty amount deducted from the vendor's available balance, in Kobo. */
  penaltyAmount: number;
  /** _id of the dispute document. */
  disputeId: mongoose.Types.ObjectId;
  session: mongoose.ClientSession;
}

export interface WriteDisputeAutoResolvedParams {
  /** The vendor whose frozen funds are being refunded to the customer. */
  vendorId: mongoose.Types.ObjectId;
  /** The frozen settle amount to be refunded to the customer, in Kobo. */
  settleAmount: number;
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
  /** How the release was triggered — stored in metadata for auditability. */
  triggeredBy: "CUSTOMER_CONFIRMATION" | "AUTO_CONFIRMATION";
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
    const { totalAmount, orderId, flutterwaveReference, session } = params;

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
   * Record the freezing of a vendor's available funds when a dispute is opened.
   *
   * Journal entry:
   *   DEBIT   VENDOR_DISPUTED    settleAmount
   *   CREDIT  VENDOR_AVAILABLE   settleAmount
   *
   * The DEBIT on VENDOR_DISPUTED marks the funds as frozen. The CREDIT on
   * VENDOR_AVAILABLE records the corresponding reduction in the vendor's
   * withdrawable balance.
   *
   * @param params - Dispute opened parameters
   */
  async writeDisputeOpened(params: WriteDisputeOpenedParams): Promise<void> {
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
   * Record the return of frozen funds to a vendor when a dispute is rejected.
   *
   * Journal entry:
   *   DEBIT   VENDOR_AVAILABLE   settleAmount
   *   CREDIT  VENDOR_DISPUTED    settleAmount
   *
   * This reverses the writeDisputeOpened entry — VENDOR_DISPUTED is credited
   * (cleared) and VENDOR_AVAILABLE is debited (increased), returning the funds
   * to the vendor's withdrawable balance.
   *
   * @param params - Dispute rejected parameters
   */
  async writeDisputeRejected(
    params: WriteDisputeRejectedParams,
  ): Promise<void> {
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
   * Record the outcome of an upheld dispute — a refund owed to the customer
   * plus a penalty deducted from the vendor.
   *
   * This produces four ledger lines sharing one journal entry (two balanced pairs):
   *
   *   Pair 1 — Refund:
   *     DEBIT   VENDOR_DISPUTED               settleAmount
   *     CREDIT  CUSTOMER_REFUND_PAYABLE       settleAmount
   *
   *   Pair 2 — Penalty:
   *     DEBIT   VENDOR_AVAILABLE              penaltyAmount
   *     CREDIT  PLATFORM_REVENUE_PENALTIES    penaltyAmount
   *
   * The invariant check verifies that total credits === total debits across
   * all four lines before any DB write occurs.
   *
   * @param params - Dispute upheld parameters
   */
  async writeDisputeUpheld(params: WriteDisputeUpheldParams): Promise<void> {
    const { vendorId, settleAmount, penaltyAmount, disputeId, session } =
      params;

    assertValidKoboAmount(settleAmount, "settleAmount");
    assertValidKoboAmount(penaltyAmount, "penaltyAmount");

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
        amount: settleAmount,
      },
      // Pair 2: penalty deducted from vendor available, credited to platform
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.VENDOR_AVAILABLE,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: penaltyAmount,
      },
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
          `Dispute ${disputeId} upheld — refund of ${settleAmount} Kobo issued ` +
          `and penalty of ${penaltyAmount} Kobo applied to vendor ${vendorId}`,
        metadata: { vendorId, disputeId, settleAmount, penaltyAmount },
      },
      lines,
      session,
    );
  }

  /**
   * Record a system-triggered auto-resolution of an overdue dispute.
   *
   * This is a restricted variant of writeDisputeUpheld used exclusively by
   * the DisputeAutoResolutionService. The outcome is financially identical to
   * an upheld dispute (frozen funds refunded to the customer) but NO penalty
   * is applied to the vendor — the platform team failed to resolve the dispute
   * in time, so the vendor is not penalised for the team's inaction.
   *
   * Journal entry (pair 1 of writeDisputeUpheld only):
   *   DEBIT   VENDOR_DISPUTED          settleAmount
   *   CREDIT  CUSTOMER_REFUND_PAYABLE  settleAmount
   *
   * @param params - Dispute auto-resolved parameters
   */
  async writeDisputeAutoResolved(
    params: WriteDisputeAutoResolvedParams,
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
        accountType: LedgerAccountType.CUSTOMER_REFUND_PAYABLE,
        amount: settleAmount,
      },
    ];

    await this.commitEntry(
      {
        category: LedgerEntryCategory.REFUND_ISSUED,
        referenceType: LedgerReferenceType.DISPUTE,
        referenceId: disputeId,
        description:
          `Dispute ${disputeId} auto-resolved — refund of ${settleAmount} Kobo issued to customer. ` +
          `No penalty applied: platform team failed to resolve within the deadline.`,
        metadata: {
          vendorId,
          disputeId,
          settleAmount,
          penaltyAmount: 0,
          triggeredBy: "SYSTEM_AUTO_RESOLUTION",
        },
      },
      lines,
      session,
    );
  }

  /**
   * Record a vendor withdrawal request — available funds move into the
   * in-flight PAYOUT_PROCESSING account.
   *
   * Journal entry:
   *   DEBIT   PAYOUT_PROCESSING   netPayoutAmount
   *   CREDIT  VENDOR_AVAILABLE    netPayoutAmount
   *
   * `netPayoutAmount` is the amount after any debt recovery deduction has
   * already been calculated by the caller. Debt recovery itself is recorded
   * separately via writeDebtRecovery.
   *
   * @param params - Payout initiated parameters
   */
  async writePayoutInitiated(
    params: WritePayoutInitiatedParams,
  ): Promise<void> {
    const { vendorId, netPayoutAmount, payoutId, session } = params;

    assertValidKoboAmount(netPayoutAmount, "netPayoutAmount");

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.PAYOUT_PROCESSING,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: netPayoutAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.VENDOR_AVAILABLE,
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
   * Record a successfully completed payout — the PAYOUT_PROCESSING account
   * is closed and any gateway fee is recognised as an expense.
   *
   * Journal entry (with gateway fee):
   *   DEBIT   PLATFORM_ESCROW       netAmount                  ← funds exit the platform
   *   DEBIT   GATEWAY_FEES_EXPENSE  gatewayFee                 ← fee recognised as expense
   *   CREDIT  PAYOUT_PROCESSING     netAmount + gatewayFee     ← processing account closed
   *
   * Journal entry (no gateway fee):
   *   DEBIT   PLATFORM_ESCROW       netAmount
   *   CREDIT  PAYOUT_PROCESSING     netAmount
   *
   * The DEBIT on PLATFORM_ESCROW represents funds physically leaving the
   * platform to the vendor's bank account. The CREDIT closes the in-flight
   * PAYOUT_PROCESSING balance opened by writePayoutInitiated.
   *
   * The caller must ensure `netAmount + gatewayFee` equals the amount that
   * was placed into PAYOUT_PROCESSING when the payout was initiated.
   *
   * @param params - Payout completed parameters
   */
  async writePayoutCompleted(
    params: WritePayoutCompletedParams,
  ): Promise<void> {
    const { vendorId, netAmount, gatewayFee, payoutId, session } = params;

    assertValidKoboAmount(netAmount, "netAmount");

    // gatewayFee is allowed to be 0 — it means the platform absorbed it
    if (!Number.isInteger(gatewayFee) || gatewayFee < 0) {
      throw new Error(
        `Invalid gatewayFee: expected a non-negative integer in Kobo, got ${gatewayFee}.`,
      );
    }

    const totalProcessingAmount = netAmount + gatewayFee;

    // PAYOUT_COMPLETED always has three conceptual movements:
    //   1. Funds physically exit the platform  → DEBIT PLATFORM_ESCROW (netAmount)
    //   2. Gateway fee is recognised as expense → DEBIT GATEWAY_FEES_EXPENSE (gatewayFee, if > 0)
    //   3. In-flight processing account closes  → CREDIT PAYOUT_PROCESSING (netAmount + gatewayFee)
    //
    // When gatewayFee is 0 the fee line is omitted, leaving a simple two-line entry.
    const lines: PendingLedgerLine[] = [
      // Funds physically leave the platform
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.PLATFORM_ESCROW,
        amount: netAmount,
      },
      // Close the in-flight processing balance (covers both the net transfer and the fee)
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.PAYOUT_PROCESSING,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: totalProcessingAmount,
      },
      // Fee line — only present when the gateway actually charged one
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
   * Record a failed payout — reverse the PAYOUT_PROCESSING deduction so the
   * vendor's available balance is restored.
   *
   * Journal entry:
   *   DEBIT   VENDOR_AVAILABLE    requestedAmount
   *   CREDIT  PAYOUT_PROCESSING   requestedAmount
   *
   * The CREDIT on PAYOUT_PROCESSING closes the in-flight balance. The DEBIT on
   * VENDOR_AVAILABLE restores the funds to the vendor's withdrawable balance.
   *
   * @param params - Payout failed parameters
   */
  async writePayoutFailed(params: WritePayoutFailedParams): Promise<void> {
    const { vendorId, requestedAmount, payoutId, session } = params;

    assertValidKoboAmount(requestedAmount, "requestedAmount");

    const lines: PendingLedgerLine[] = [
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.VENDOR_AVAILABLE,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: requestedAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.PAYOUT_PROCESSING,
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
   * Record a debt recovery deduction withheld from a vendor's payout.
   *
   * This uses a DEBT_RECOVERY_CLEARING intermediate account to produce two
   * balanced pairs within one journal entry:
   *
   *   Pair 1 — Withhold from vendor:
   *     DEBIT   DEBT_RECOVERY_CLEARING   recoveredAmount
   *     CREDIT  VENDOR_AVAILABLE         recoveredAmount
   *
   *   Pair 2 — Credit to platform as penalty revenue:
   *     DEBIT   PLATFORM_REVENUE_PENALTIES   recoveredAmount
   *     CREDIT  DEBT_RECOVERY_CLEARING       recoveredAmount
   *
   * The clearing account opens and closes within the same journal entry,
   * leaving a net zero balance on DEBT_RECOVERY_CLEARING.
   *
   * This method should be called before writePayoutInitiated when a payout
   * includes a debt recovery deduction.
   *
   * @param params - Debt recovery parameters
   */
  async writeDebtRecovery(params: WriteDebtRecoveryParams): Promise<void> {
    const { vendorId, recoveredAmount, payoutId, session } = params;

    assertValidKoboAmount(recoveredAmount, "recoveredAmount");

    const lines: PendingLedgerLine[] = [
      // Pair 1: withheld from vendor's available balance via clearing account
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.DEBT_RECOVERY_CLEARING,
        amount: recoveredAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.VENDOR_AVAILABLE,
        entityId: vendorId,
        entityType: LedgerEntityType.VENDOR,
        amount: recoveredAmount,
      },
      // Pair 2: clearing account is closed, platform earns the recovery
      {
        type: LedgerEntryType.DEBIT,
        accountType: LedgerAccountType.PLATFORM_REVENUE_PENALTIES,
        amount: recoveredAmount,
      },
      {
        type: LedgerEntryType.CREDIT,
        accountType: LedgerAccountType.DEBT_RECOVERY_CLEARING,
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
   * Used when the gateway fee is recorded separately from the payout
   * completion (e.g. when the fee is disclosed after the transfer completes).
   * If the gateway fee is recorded at payout completion time, use the
   * `gatewayFee` parameter on writePayoutCompleted instead.
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
   * Record the release of a vendor's pending funds to their available balance
   * following a confirmed delivery.
   *
   * This is triggered either by the customer explicitly confirming receipt
   * or by the auto-confirmation background job after the confirmation window
   * has elapsed.
   *
   * Journal entry:
   *   DEBIT   VENDOR_AVAILABLE   settleAmount
   *   CREDIT  VENDOR_PENDING     settleAmount
   *
   * The CREDIT on VENDOR_PENDING closes the balance that was opened by
   * writeOrderSettlement at payment time. The DEBIT on VENDOR_AVAILABLE
   * makes the funds withdrawable by the vendor.
   *
   * @param params - Funds released parameters
   */
  async writeFundsReleased(params: WriteFundsReleasedParams): Promise<void> {
    const { vendorId, settleAmount, suborderId, triggeredBy, session } = params;

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
        accountType: LedgerAccountType.VENDOR_PENDING,
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
   * This is distinct from the Flutterwave gateway fee (writeGatewayFee) —
   * it represents Soraxi's own revenue for handling the withdrawal, not a
   * third-party cost. The fee is withheld from the vendor's available balance
   * before the net payout amount enters PAYOUT_PROCESSING.
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
   * This is the exact mirror of writePayoutProcessingFee — it undoes
   * the revenue that was credited to the platform when the payout was
   * initiated, returning the fee amount to the vendor's available balance.
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
   * This is the exact mirror of writeGatewayFee — it undoes the expense
   * that was recorded when the payout was initiated, crediting
   * GATEWAY_FEES_EXPENSE back and debiting PLATFORM_ESCROW.
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
