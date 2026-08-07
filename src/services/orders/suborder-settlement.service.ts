import "server-only";
import mongoose from "mongoose";

import { SuborderFinancialStatus } from "@/enums/financial.enums";
import { releaseVendorPendingToAvailable } from "@/lib/db/models/vendor-wallet.model";
import { AppError } from "@/lib/errors/app-error";
import {
  getTransactionRecordByOrderId,
  updateSuborderFinancialStatus,
} from "@/lib/db/models/transaction-record.model";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";

export type SettlementTrigger =
  | "CUSTOMER_CONFIRMATION"
  | "AUTO_CONFIRMATION"
  | "DELIVERY_CODE";

export interface SettlementResult {
  /** False when the sub-order had already left PENDING — a no-op, not a failure. */
  settled: boolean;
  settleAmount?: number;
}

/**
 * Releases a sub-order's escrowed funds to its vendor.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A SHARED SERVICE
 * ─────────────────────────────────────────────────────────────────────────────
 * Escrow release now has three callers: the customer confirming in their app,
 * the nightly auto-confirm cron, and a proof-of-delivery code being entered.
 * They differ only in what triggered them.
 *
 * Left as three copies, the ledger writes, the financial-status update and the
 * wallet move would drift apart the first time one caller was edited — and a
 * divergence here is a money bug, not a display bug. There is exactly one
 * implementation, and callers choose a `trigger`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * IDEMPOTENCY
 * ─────────────────────────────────────────────────────────────────────────────
 * A sub-order that has already left `PENDING` — settled, disputed, refunded —
 * returns `{ settled: false }` rather than throwing. Double-release is the
 * worst possible outcome here, and this guard is what prevents it when two
 * paths race (a customer confirming at the same moment a rider enters the
 * code, which is not hypothetical: both happen at the doorstep).
 *
 * MUST be called inside a transaction. The ledger write, status update and
 * wallet move have to commit together or not at all.
 */
export async function settleSuborder({
  orderId,
  subOrderId,
  trigger,
  session,
}: {
  orderId: string;
  subOrderId: string;
  trigger: SettlementTrigger;
  session: mongoose.ClientSession;
}): Promise<SettlementResult> {
  const transactionRecord = await getTransactionRecordByOrderId(orderId);

  if (!transactionRecord) {
    throw new AppError(
      "NOT_FOUND",
      `Transaction record not found for order ${orderId}`,
    );
  }

  const breakdown = transactionRecord.suborderBreakdowns.find(
    (b) => b.suborderId.toString() === subOrderId,
  );

  if (!breakdown) {
    throw new AppError(
      "NOT_FOUND",
      `No financial breakdown found for suborder ${subOrderId}`,
    );
  }

  // Already settled, disputed or refunded — nothing to do. Deliberately not an
  // error: callers race legitimately, and the second one is simply late.
  if (breakdown.status !== SuborderFinancialStatus.PENDING) {
    return { settled: false };
  }

  const writer = await JournalEntryWriter.init();

  await writer.writeFundsReleased({
    vendorId: breakdown.vendorId,
    settleAmount: breakdown.settleAmount,
    suborderId: breakdown.suborderId,
    triggeredBy: trigger,
    session,
  });

  await updateSuborderFinancialStatus(
    orderId,
    subOrderId,
    SuborderFinancialStatus.SETTLED,
    session,
  );

  await releaseVendorPendingToAvailable(
    breakdown.vendorId.toString(),
    breakdown.settleAmount,
    session,
  );

  return { settled: true, settleAmount: breakdown.settleAmount };
}
