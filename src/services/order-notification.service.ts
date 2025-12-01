import {
  NotificationFactory,
  OrderConfirmationEmail,
  StoreOrderNotificationEmail,
  renderTemplate,
} from "@/domain/notification";
import React from "react";
import mongoose from "mongoose";
import { IOrder } from "@/lib/db/models/order.model";
import { getStoreModel } from "@/lib/db/models/store.model";

type CustomerInfo = {
  fullName: string;
  email: string;
};

export class OrderNotificationService {
  /**
   * Sends notification to the customer after a successful payment.
   */
  async sendCustomerNotification(
    order: IOrder,
    customerInfo: CustomerInfo
  ): Promise<boolean> {
    try {
      const allOrderItems = order.subOrders.flatMap((subOrder) =>
        subOrder.products.map((p) => ({
          name: p.productSnapshot.name,
          quantity: p.productSnapshot.quantity,
          price: p.productSnapshot.price || 0,
        }))
      );

      const totalAmount = allOrderItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      const html = await renderTemplate(
        React.createElement(OrderConfirmationEmail, {
          customerName: customerInfo.fullName || "Customer",
          orderId: (order._id as { toString: () => string }).toString(),
          items: allOrderItems,
          totalAmount,
          deliveryDate: undefined,
        })
      );

      const notification = NotificationFactory.create("email", {
        recipient: customerInfo.email,
        subject: `Order Confirmation - ${(order._id as { toString: () => string }).toString()}`,
        emailType: "orderConfirmation",
        fromAddress: "orders@soraxihub.com",
        html,
        text: `Thank you for your order! Your order ID is ${(order._id as { toString: () => string }).toString()}.`,
      });

      await notification.send();
      return true;
    } catch (error) {
      console.error("Failed to send customer notification:", error);
      return false;
    }
  }

  /**
   * Sends notifications to each store for their respective sub-orders.
   */
  async sendStoreNotifications(
    order: IOrder,
    customerInfo: CustomerInfo
  ): Promise<number> {
    const Store = await getStoreModel();
    let sent = 0;

    try {
      for (const subOrder of order.subOrders) {
        const store = await Store.findById(subOrder.storeId)
          .select("name storeEmail _id")
          .lean<{
            _id: mongoose.Types.ObjectId;
            name: string;
            storeEmail: string;
          }>();

        if (!store?.storeEmail) continue;

        const items = subOrder.products.map((p) => ({
          name: p.productSnapshot.name,
          quantity: p.productSnapshot.quantity,
          price: p.productSnapshot.price || 0,
          productId: p.productId.toString(),
        }));

        const totalAmount = items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        );

        const deliveryAddress = order.shippingAddress
          ? {
              street: order.shippingAddress.address,
              deliveryType: order.shippingAddress.deliveryType,
              country: "Nigeria",
              postalCode: order.shippingAddress.postalCode,
            }
          : undefined;

        const html = await renderTemplate(
          React.createElement(StoreOrderNotificationEmail, {
            storeName: store.name,
            storeId: store._id.toString(),
            orderId: (order._id as { toString: () => string }).toString(),
            items,
            totalAmount,
            customerName: customerInfo.fullName,
            customerEmail: customerInfo.email,
            deliveryAddress,
          })
        );

        const notification = NotificationFactory.create("email", {
          recipient: store.storeEmail,
          subject: `New Order Received - ${(order._id as { toString: () => string }).toString()}`,
          emailType: "storeOrderNotification",
          fromAddress: "orders@soraxihub.com",
          html,
          text: `You have received a new order with ID: ${(order._id as { toString: () => string }).toString()}.`,
        });

        await notification.send();
        sent++;
      }
    } catch (err) {
      console.error("Failed to send store notifications:", err);
    }

    return sent;
  }
}
