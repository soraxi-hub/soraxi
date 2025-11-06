import { PaymentStatus } from "@/enums";
import { getOrderModel, IOrder } from "@/lib/db/models/order.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import mongoose, { Model } from "mongoose";
import {
  NotificationFactory,
  OrderConfirmationEmail,
  renderTemplate,
  StoreOrderNotificationEmail,
} from "../notification";
import React from "react";
import { FlutterwaveTransactionData } from "../payments/flutterwave/payment";

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
  private readonly expireAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14); // 14 days i.e, 2 weeks.

  private constructor() {}

  static async init(): Promise<ProcessOrder> {
    const service = new ProcessOrder();
    service.Order = await getOrderModel();
    await getStoreModel();
    return service;
  }

  async updateOrderRecord({
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

    // Send notifications
    await Promise.all([
      this.sendCustomerNotification(order, customerInfo),
      this.sendStoreNotifications(order, customerInfo),
    ]);

    return {
      ok: true,
      message: "Order record updated successfully",
      userId: order.userId.toString(),
    };
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

    // find order by ID
    const order = await this.Order.findById(
      new mongoose.Types.ObjectId(orderId)
    )
      .session(session)
      .select("paymentStatus expireAt");

    if (!order) {
      return { ok: false, error: "Order not found" };
    }

    // If already in a teminal state, return.
    // else, the order payment status is in the pending state, thus update it
    if (failedStatusArr.includes(order.paymentStatus)) {
      return { ok: true, status: order.paymentStatus };
    }

    order.expireAt = this.expireAt;

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

    order.expireAt = this.expireAt;
    order.paymentStatus = PaymentStatus.Cancelled;

    const updatedOrder = await order.save({ session });
    return { ok: true, status: updatedOrder.paymentStatus };
  }

  async sendCustomerNotification(
    order: IOrder,
    customerInfo: CustomerInfo
  ): Promise<boolean> {
    try {
      // Prepare all order items for customer email
      const allOrderItems = order.subOrders.flatMap((subOrder) =>
        subOrder.products.map((p) => ({
          name: p.productSnapshot.name,
          quantity: p.productSnapshot.quantity,
          price: p.productSnapshot.price || 0,
        }))
      );

      // Calculate total for entire order
      const totalAmount = allOrderItems.reduce(
        (sum: number, item) => sum + item.price * item.quantity,
        0
      );

      // Render customer order confirmation email
      const customerHtml = await renderTemplate(
        React.createElement(OrderConfirmationEmail, {
          customerName: customerInfo.fullName || "Customer",
          orderId: (order._id as { toString: () => string }).toString(),
          items: allOrderItems,
          totalAmount: totalAmount,
          deliveryDate: undefined, // I can't really do this since the order contains multiple stores with different delivery estimates
        })
      );

      // Send customer notification
      const customerNotification = NotificationFactory.create("email", {
        recipient: customerInfo.email,
        subject: `Order Confirmation - ${(order._id as { toString: () => string }).toString()}`,
        emailType: "orderConfirmation",
        fromAddress: "orders@soraxihub.com",
        html: customerHtml,
        text: `Thank you for your order! Your order ID is ${(order._id as { toString: () => string }).toString()}. We'll notify you when your order ships.`,
      });

      await customerNotification.send();
      return true;
    } catch (error) {
      console.error("Failed to send customer notification:", error);
      return false;
    }
  }

  async sendStoreNotifications(
    order: IOrder,
    customerInfo: CustomerInfo
  ): Promise<number> {
    let successfulNotifications = 0;

    try {
      const Store = await getStoreModel();

      for (const subOrder of order.subOrders) {
        const storeDoc = await Store.findById(subOrder.storeId)
          .select("name storeEmail _id")
          .lean<{
            _id: mongoose.Types.ObjectId;
            name: string;
            storeEmail: string;
          }>();

        if (!storeDoc?.storeEmail) continue;

        // Prepare store-specific order items
        const storeOrderItems = subOrder.products.map((p) => ({
          name: p.productSnapshot.name,
          quantity: p.productSnapshot.quantity,
          price: p.productSnapshot.price || 0,
          productId: p.productId.toString(),
        }));

        // Calculate total for this store's sub-order
        const storeTotalAmount = storeOrderItems.reduce(
          (sum: number, item) => sum + item.price * item.quantity,
          0
        );

        // Get delivery address from order
        const deliveryAddress = order.shippingAddress
          ? {
              street: order.shippingAddress.address,
              deliveryType: order.shippingAddress.deliveryType,
              country: "Nigeria",
              postalCode: order.shippingAddress.postalCode,
            }
          : undefined;

        // Render store notification email
        const storeHtml = await renderTemplate(
          React.createElement(StoreOrderNotificationEmail, {
            storeName: storeDoc.name,
            storeId: storeDoc._id.toString(),
            orderId: (order._id as { toString: () => string }).toString(),
            items: storeOrderItems,
            totalAmount: storeTotalAmount,
            customerName: customerInfo.fullName,
            customerEmail: customerInfo.email,
            deliveryAddress: deliveryAddress,
          })
        );

        // Send store notification
        const storeNotification = NotificationFactory.create("email", {
          recipient: storeDoc.storeEmail,
          subject: `New Order Received - ${(order._id as { toString: () => string }).toString()}`,
          emailType: "storeOrderNotification",
          fromAddress: "orders@soraxihub.com",
          html: storeHtml,
          text: `You have received a new order with ID: ${(order._id as { toString: () => string }).toString()}. Please log in to your dashboard to view details.`,
        });

        await storeNotification.send();
        successfulNotifications++;
      }
    } catch (error) {
      console.error("Failed to send store notifications:", error);
    }

    return successfulNotifications;
  }
}
