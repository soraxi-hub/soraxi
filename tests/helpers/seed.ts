import mongoose from "mongoose";
import { calculateCommission } from "@/lib/utils/calculate-commission";
import { createTransactionRecord } from "@/lib/db/models/transaction-record.model";
import {
  getVendorWalletModel,
  creditVendorPendingBalance,
  type IVendorWalletDocument,
} from "@/lib/db/models/vendor-wallet.model";
import {
  initialisePlatformWallet,
  creditPlatformCommission,
} from "@/lib/db/models/platform-wallet.model";
import { JournalEntryWriter } from "@/services/journal-entry-writer.service";
import {
  GatewayPaymentStatus,
  LedgerEntityType,
  SuborderFinancialStatus,
} from "@/enums/financial.enums";
import { withTransaction } from "./test-db";
import { getOrderModel } from "@/lib/db/models/order.model";
import { DeliveryType, PaymentGateway, PaymentStatus } from "@/enums";

import { settleSuborder } from "@/services/orders/suborder-settlement.service";

export interface SeededSuborder {
  suborderId: mongoose.Types.ObjectId;
  vendorId: mongoose.Types.ObjectId;
  grossAmount: number;
  commission: number;
  settleAmount: number;
}

export interface SeededPaidOrder {
  orderId: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  totalAmount: number;
  totalCommission: number;
  collectionFeeKobo: number;
  suborders: SeededSuborder[];
}

/**
 * Seed a minimal pending Order document — enough for the payment-confirmation
 * state machine (status transitions, ownership, gateway resolution, sweep
 * eligibility). Deliberately not a full checkout: the financial composition of
 * a paid order is covered by seedPaidOrder and the Stage 1-5 suites.
 */
export async function seedPendingOrder(params: {
  reference: string;
  userId?: mongoose.Types.ObjectId;
  totalAmount?: number;
  gateway?: PaymentGateway;
  paymentStatus?: PaymentStatus;
  /** Backdate createdAt to test sweep eligibility. */
  createdAt?: Date;
}): Promise<{ orderId: mongoose.Types.ObjectId; userId: mongoose.Types.ObjectId }> {
  const Order = await getOrderModel();
  const userId = params.userId ?? new mongoose.Types.ObjectId();

  const order = await Order.create({
    userId,
    userSnapshot: {
      name: "Ada Obi",
      email: "student@school.edu.ng",
      phoneNumber: "+2348012345678",
    },
    stores: [],
    subOrders: [],
    totalAmount: params.totalAmount ?? 500_000,
    shippingAddress: {
      address: "12 Campus Road",
      city: "Nsukka",
      state: "Enugu",
      deliveryType: DeliveryType.Campus,
    },
    paymentStatus: params.paymentStatus ?? PaymentStatus.Pending,
    paymentGateway: params.gateway ?? PaymentGateway.Flutterwave,
    idempotencyKey: params.reference,
  });

  if (params.createdAt) {
    // createdAt is managed by timestamps, so it must be forced past Mongoose.
    await Order.collection.updateOne(
      { _id: order._id },
      { $set: { createdAt: params.createdAt } },
    );
  }

  return { orderId: order._id, userId };
}

/** Create a vendor wallet with zero balances, outside any transaction. */
export async function seedVendorWallet(
  vendorId: mongoose.Types.ObjectId,
): Promise<IVendorWalletDocument> {
  const VendorWallet = await getVendorWalletModel();
  return new VendorWallet({ vendorId }).save();
}

/** Ensure the singleton platform wallet exists. */
export async function seedPlatformWallet(): Promise<void> {
  await initialisePlatformWallet();
}

/**
 * Seed a fully paid order — Stage 1 of the fund flow.
 *
 * This mirrors, call for call, the financial composition of
 * `ProcessOrder.processPaymentConfirmedFinancials`
 * (src/services/orders/process-order.service.ts:296-346):
 *
 *   1. createTransactionRecord (per-suborder breakdowns via calculateCommission)
 *   2. writer.writePaymentReceived        — gross into escrow
 *   3. per suborder: writer.writeSuborderSettlement + creditVendorPendingBalance
 *   4. writer.writeCollectionFee          — if collectionFeeKobo > 0
 *   5. creditPlatformCommission           — total commission into wallet cache
 *
 * If the production composition changes, update this seeder to match — the
 * point of the suite is to validate exactly what production writes.
 */
export async function seedPaidOrder(params: {
  /** Gross amount (Kobo) each vendor's suborder was sold for. */
  suborderGrossAmounts: number[];
  vendorIds: mongoose.Types.ObjectId[];
  customerId?: mongoose.Types.ObjectId;
  collectionFeeKobo?: number;
}): Promise<SeededPaidOrder> {
  const {
    suborderGrossAmounts,
    vendorIds,
    customerId = new mongoose.Types.ObjectId(),
    collectionFeeKobo = 0,
  } = params;

  if (suborderGrossAmounts.length !== vendorIds.length) {
    throw new Error("suborderGrossAmounts and vendorIds must align");
  }

  const orderId = new mongoose.Types.ObjectId();

  const suborders: SeededSuborder[] = suborderGrossAmounts.map(
    (grossAmount, i) => {
      const { commission, settleAmount } = calculateCommission(grossAmount);
      return {
        suborderId: new mongoose.Types.ObjectId(),
        vendorId: vendorIds[i]!,
        grossAmount,
        commission,
        settleAmount,
      };
    },
  );

  const totalAmount = suborders.reduce((sum, s) => sum + s.grossAmount, 0);
  const totalCommission = suborders.reduce((sum, s) => sum + s.commission, 0);

  const writer = await JournalEntryWriter.init();

  await withTransaction(async (session) => {
    await createTransactionRecord(
      {
        customerId,
        orderId,
        paymentProvider: PaymentGateway.Flutterwave,
        gatewayReference: `TEST-REF-${orderId.toString()}`,
        gatewayTransactionId: `TEST-TXN-${orderId.toString()}`,
        gatewayStatus: GatewayPaymentStatus.SUCCESSFUL,
        totalAmount,
        suborderBreakdowns: suborders.map((s) => {
          const { details } = calculateCommission(s.grossAmount);
          return {
            suborderId: s.suborderId,
            vendorId: s.vendorId,
            grossAmount: s.grossAmount,
            commission: s.commission,
            settleAmount: s.settleAmount,
            commissionDetails: {
              percentageFee: details.percentageFee,
              flatFeeApplied: details.flatFeeApplied,
            },
            status: SuborderFinancialStatus.PENDING,
          };
        }),
      },
      session,
    );

    await writer.writePaymentReceived({
      totalAmount,
      orderId,
      entityId: customerId,
      entityType: LedgerEntityType.CUSTOMER,
      gatewayReference: `TEST-REF-${orderId.toString()}`,
      session,
    });

    for (const s of suborders) {
      await writer.writeSuborderSettlement({
        vendorId: s.vendorId,
        customerId,
        settleAmount: s.settleAmount,
        commission: s.commission,
        amountPaid: s.grossAmount,
        suborderId: s.suborderId,
        session,
      });

      await creditVendorPendingBalance(
        s.vendorId.toString(),
        s.settleAmount,
        session,
      );
    }

    if (collectionFeeKobo > 0) {
      await writer.writeCollectionFee({
        feeAmount: collectionFeeKobo,
        orderId,
        session,
      });
    }

    await creditPlatformCommission(totalCommission, session);
  });

  return {
    orderId,
    customerId,
    totalAmount,
    totalCommission,
    collectionFeeKobo,
    suborders,
  };
}

/**
 * Stage 1 + Stage 2 in one call: a paid order whose (single) suborder has been
 * delivered and released — funds sitting in VENDOR_AVAILABLE. The starting
 * point for dispute and payout scenarios.
 */
export async function seedSettledSuborder(params: {
  grossAmount: number;
  vendorId: mongoose.Types.ObjectId;
  customerId?: mongoose.Types.ObjectId;
}): Promise<SeededPaidOrder> {
  const order = await seedPaidOrder({
    suborderGrossAmounts: [params.grossAmount],
    vendorIds: [params.vendorId],
    customerId: params.customerId,
  });

  await withTransaction((session) =>
    settleSuborder({
      orderId: order.orderId.toString(),
      subOrderId: order.suborders[0]!.suborderId.toString(),
      trigger: "CUSTOMER_CONFIRMATION",
      session,
    }),
  );

  return order;
}
