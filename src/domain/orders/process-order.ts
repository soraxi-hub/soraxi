import { PaymentStatus } from "@/enums";
import { getOrderModel, type IOrder } from "@/lib/db/models/order.model";
import { getStoreModel, IStore } from "@/lib/db/models/store.model";
import { createFundRelease } from "@/lib/utils/fund-release-service";
import { getWalletModel } from "@/lib/db/models/wallet.model";
import mongoose, { type Model } from "mongoose";
import type { FlutterwaveTransactionData } from "../payments/flutterwave/payment";
import { OrderNotificationService } from "@/services/order-notification.service";
import { currencyOperations } from "@/lib/utils/naira";

type CustomerInfo = {
  fullName: string;
  email: string;
};

type UpdateOrderRecordProps = {
  orderId: string;
  idempotencyKey: string;
  session: mongoose.ClientSession | null;
  paymentMethod: string;
  customerInfo: CustomerInfo;
};

export class ProcessOrder {
  private Order!: Model<IOrder>;
  private orderNotificationService = new OrderNotificationService();

  private constructor() {}

  static async init(): Promise<ProcessOrder> {
    const service = new ProcessOrder();
    service.Order = await getOrderModel();
    await getStoreModel();
    return service;
  }

  async updateOrderRecordToSuccessState({
    orderId,
    idempotencyKey,
    session,
    paymentMethod,
    customerInfo,
  }: UpdateOrderRecordProps): Promise<{
    ok: boolean;
    error?: string;
    message?: string;
    userId?: string;
  }> {
    const statusArr = [PaymentStatus.Failed, PaymentStatus.Cancelled];

    // find order by ID
    const order = await this.Order.findById(
      new mongoose.Types.ObjectId(orderId)
    ).populate("subOrders.storeId");

    if (!order) {
      return { ok: false, error: "Order not found" };
    }

    // check idempotencyKey to prevent duplicate processing
    if (order.idempotencyKey === idempotencyKey) {
      if (order.paymentStatus === PaymentStatus.Paid) {
        return {
          ok: true,
          message: "Order already paid",
          userId: order.userId.toString(),
        };
      }
      if (statusArr.includes(order.paymentStatus)) {
        return {
          ok: true,
          message: "Order in terminal state",
          userId: order.userId.toString(),
        };
      }
      // else → pending, allow update to continue
    }

    // update payment status
    order.paymentStatus = PaymentStatus.Paid;
    order.paymentMethod = paymentMethod;
    await order.save({ session });

    try {
      await this.createFundReleasesForOrder(order, session);
    } catch (error) {
      console.error("Error creating fund releases:", error);
      // Log error but don't fail the order - fund releases can be retried
      // In production, you'd want to trigger an admin alert here
      // Track failed fund releases for retry/reconciliation
      // Consider: queue for retry, flag order for admin review, or emit alert
      // At minimum, persist the failure state for later recovery
    }

    // Send notifications
    await Promise.all([
      this.orderNotificationService.sendCustomerNotification(
        order,
        customerInfo
      ),
      this.orderNotificationService.sendStoreNotifications(order, customerInfo),
    ]);

    return {
      ok: true,
      message: "Order record updated successfully",
      userId: order.userId.toString(),
    };
  }

  private async createFundReleasesForOrder(
    order: IOrder,
    session: mongoose.ClientSession | null
  ): Promise<void> {
    const Wallet = await getWalletModel();

    if (!session) {
      throw new Error("Session required for fund release creation");
    }

    for (const subOrder of order.subOrders) {
      // Get the store object (populated in the query above)
      const store = (subOrder.storeId as unknown as IStore) || null;

      if (!store) {
        console.warn(`Store not found for subOrder ${subOrder._id}`);
        continue;
      }

      // Create the fund release record
      const fundRelease = await createFundRelease(
        store,
        order,
        subOrder,
        session
      );

      console.log(
        `Fund release created for subOrder ${subOrder._id}: ${fundRelease._id}`
      );

      // Update the store's wallet - add to pending funds
      if (store.walletId) {
        const wallet = await Wallet.findById(store.walletId).session(session);
        if (wallet) {
          // wallet.pending = (wallet.pending || 0) + (amount - commission);
          wallet.pending = currencyOperations.add(
            wallet.pending || 0,
            fundRelease.settlement.amount,
            fundRelease.settlement.shippingPrice
          );
          await wallet.save({ session });
          console.log(
            `Updated wallet ${store.walletId} - pending funds: ${wallet.pending}`
          );
        }
      }
    }
  }

  async updateOrderRecordToFailureState({
    orderId,
    session,
    transactionDataStatus,
  }: {
    orderId: UpdateOrderRecordProps["orderId"];
    session: UpdateOrderRecordProps["session"];
    transactionDataStatus: FlutterwaveTransactionData["status"];
  }): Promise<{
    ok: boolean;
    error?: string;
    status?: PaymentStatus;
  }> {
    const failedStatusArr = [PaymentStatus.Failed, PaymentStatus.Cancelled];

    const order = await this.Order.findById(
      new mongoose.Types.ObjectId(orderId)
    )
      .session(session)
      .select("paymentStatus expireAt");

    if (!order) {
      return { ok: false, error: "Order not found" };
    }

    if (failedStatusArr.includes(order.paymentStatus)) {
      return { ok: true, status: order.paymentStatus };
    }

    if (transactionDataStatus.toLowerCase() === "failed") {
      order.paymentStatus = PaymentStatus.Failed;
    } else {
      order.paymentStatus = PaymentStatus.Cancelled;
    }

    const updatedOrder = await order.save({ session });

    return { ok: true, status: updatedOrder.paymentStatus };
  }

  async handleCancelledOrder({
    tx_ref,
    session,
  }: {
    tx_ref: string;
    session: UpdateOrderRecordProps["session"];
  }): Promise<{
    ok: boolean;
    error?: string;
    status?: PaymentStatus;
  }> {
    const statusArr = [
      PaymentStatus.Paid,
      PaymentStatus.Cancelled,
      PaymentStatus.Failed,
    ];

    const order = await this.Order.findOne({
      idempotencyKey: tx_ref,
    })
      .session(session)
      .select("paymentStatus expireAt");

    if (!order) {
      return { ok: false, error: "Order not found" };
    }

    if (statusArr.includes(order.paymentStatus)) {
      return { ok: true, status: order.paymentStatus };
    }

    order.paymentStatus = PaymentStatus.Cancelled;

    const updatedOrder = await order.save({ session });
    return { ok: true, status: updatedOrder.paymentStatus };
  }
}
