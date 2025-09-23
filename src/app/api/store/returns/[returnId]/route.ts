import { type NextRequest, NextResponse } from "next/server";
import { getOrderModel } from "@/lib/db/models/order.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";
import mongoose from "mongoose";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ returnId: string }> }
) {
  try {
    const { returnId } = await params;
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");

    // console.log("Fetching return details for:", returnId, "Store ID:", storeId);

    if (!storeId || !returnId) {
      return NextResponse.json(
        { error: "Store ID and Return ID are required" },
        { status: 400 }
      );
    }

    // Verify store session
    const session = await getStoreFromCookie();
    if (!session || session.id !== storeId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const Order = await getOrderModel();
    const Store = await getStoreModel();

    // Verify store exists
    const store = await Store.findById(storeId);
    if (!store) {
      return NextResponse.json({ error: "Store not found" }, { status: 404 });
    }

    const pipeline = [
      // 1. Match orders that have this storeId
      { $match: { "subOrders.storeId": new mongoose.Types.ObjectId(storeId) } },

      // 2. Unwind subOrders
      { $unwind: "$subOrders" },

      // 3. Filter subOrders by storeId again
      { $match: { "subOrders.storeId": new mongoose.Types.ObjectId(storeId) } },

      // 4. Unwind returns
      { $unwind: "$subOrders.returns" },

      // 5. Match the specific returnId
      {
        $match: {
          "subOrders.returns._id": new mongoose.Types.ObjectId(returnId),
        },
      },

      // 6. Lookup user details
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },

      // 7. Lookup product details
      {
        $lookup: {
          from: "products",
          localField: "subOrders.returns.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },

      // 8. Final projection
      {
        $project: {
          _id: "$subOrders.returns._id",
          orderId: "$_id",
          subOrderId: "$subOrders._id",
          user: { $arrayElemAt: ["$userDetails", 0] },
          product: { $arrayElemAt: ["$productDetails", 0] },
          quantity: "$subOrders.returns.quantity",
          reason: "$subOrders.returns.reason",
          status: "$subOrders.returns.status",
          requestedAt: "$subOrders.returns.requestedAt",
          approvedAt: "$subOrders.returns.approvedAt",
          refundAmount: "$subOrders.returns.refundAmount",
          returnShippingCost: "$subOrders.returns.returnShippingCost",
          images: "$subOrders.returns.images", // (not in your schema yet, might be missing)
          statusHistory: "$subOrders.statusHistory",
        },
      },
    ];

    const result = await Order.aggregate(pipeline);

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      return: result[0],
    });
  } catch (error) {
    console.error("Error fetching return details:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
