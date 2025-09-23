import { type NextRequest, NextResponse } from "next/server";
import { getOrderModel } from "@/lib/db/models/order.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import {
  getWalletModel,
  getWalletTransactionModel,
} from "@/lib/db/models/wallet.model";
import mongoose from "mongoose";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";
import { DeliveryStatus } from "@/enums";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ returnId: string }> }
) {
  try {
    const { returnId } = await params;
    const body = await request.json();
    const { storeId, status, notes } = body;

    if (!storeId || !returnId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify store session
    const session = await getStoreFromCookie();
    if (!session || session.id !== storeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate status
    const validStatuses = [
      "Approved",
      "Rejected",
      "In-Transit",
      "Received",
      "Refunded",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const Order = await getOrderModel();
    const Store = await getStoreModel();

    // Verify store exists
    const store = await Store.findById(storeId);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    // Find the order with the return
    const order = await Order.findOne({
      "subOrders.storeId": store._id,
      "subOrders.returns._id": returnId,
    });

    if (!order) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 });
    }

    // console.log("Order found:", order);

    // Find the specific sub-order and return
    const subOrder = order.subOrders.find(
      (sub) =>
        sub.storeId.toString() === storeId &&
        sub.returns?.some((ret) => ret._id.toString() === returnId)
    );

    if (!subOrder) {
      return NextResponse.json(
        { error: "Sub-order not found" },
        { status: 404 }
      );
    }

    const returnRequest = subOrder.returns?.find(
      (ret) => ret._id.toString() === returnId
    );
    if (!returnRequest) {
      return NextResponse.json(
        { error: "Return request not found" },
        { status: 404 }
      );
    }

    // Start a session for transaction
    const mongoSession = await mongoose.startSession();

    try {
      await mongoSession.withTransaction(async () => {
        // Update return status
        returnRequest.status = status;

        if (status === "Approved") {
          returnRequest.approvedAt = new Date();
        }

        // Handle refund processing
        if (status === "Refunded") {
          // Update escrow information
          subOrder.escrow.refunded = true;
          subOrder.escrow.refundReason = returnRequest.reason;

          // Process wallet refund - deduct from store wallet
          const Wallet = await getWalletModel();
          const WalletTransaction = await getWalletTransactionModel();

          const storeWallet = await Wallet.findOne({ store: storeId }).session(
            mongoSession
          );
          if (storeWallet) {
            // Deduct refund amount from store balance
            storeWallet.balance -= returnRequest.refundAmount;
            await storeWallet.save({ session: mongoSession });

            // Create transaction record
            await WalletTransaction.create(
              [
                {
                  wallet: storeWallet._id,
                  type: "debit",
                  amount: returnRequest.refundAmount,
                  source: "refund",
                  description: `Refund for returned product: ${returnRequest.reason}`,
                  relatedOrderId: order._id,
                },
              ],
              { session: mongoSession }
            );
          }

          // Update delivery status if all items are returned
          const totalReturnedQuantity =
            subOrder.returns
              ?.filter((ret) => ret.status === "Refunded")
              .reduce((sum: number, ret) => sum + ret.quantity, 0) || 0;

          const totalOrderedQuantity = subOrder.products.reduce(
            (sum: number, product) => sum + product.productSnapshot.quantity,
            0
          );

          if (totalReturnedQuantity >= totalOrderedQuantity) {
            subOrder.deliveryStatus = DeliveryStatus.Refunded;
          }
        }

        // Add status history entry
        const statusMessages = {
          Approved: "Return request approved by store",
          Rejected: "Return request rejected by store",
          "In-Transit": "Return package in transit to store",
          Received: "Return package received by store",
          Refunded: "Refund processed successfully",
        };

        subOrder.statusHistory.push({
          status: status,
          timestamp: new Date(),
          notes: notes || statusMessages[status as keyof typeof statusMessages],
        });

        // Save the order
        await order.save({ session: mongoSession });
      });

      return NextResponse.json({
        success: true,
        message: `Return status updated to ${status}`,
        data: returnRequest,
      });
    } finally {
      await mongoSession.endSession();
    }
  } catch (error) {
    console.error("Error updating return status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
