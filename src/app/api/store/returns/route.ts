import { type NextRequest, NextResponse } from "next/server";
import { getOrderModel } from "@/lib/db/models/order.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const storeId = searchParams.get("storeId");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    if (!storeId) {
      return NextResponse.json(
        { error: "Store ID is required" },
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

    // Build aggregation pipeline
    const pipeline: any[] = [
      // Match orders that have sub-orders for this store
      {
        $match: {
          "subOrders.store": store._id,
        },
      },
      // Unwind sub-orders
      {
        $unwind: "$subOrders",
      },
      // Match only sub-orders for this store that have returns
      {
        $match: {
          "subOrders.store": store._id,
          "subOrders.returns": { $exists: true, $ne: [] },
        },
      },
      // Unwind returns
      {
        $unwind: "$subOrders.returns",
      },
      // Add status filter if provided
      ...(status && status !== "all"
        ? [
            {
              $match: {
                "subOrders.returns.status": status,
              },
            },
          ]
        : []),
      // Lookup user details
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      // Lookup product details
      {
        $lookup: {
          from: "products",
          localField: "subOrders.returns.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      // Project the fields we need
      {
        $project: {
          _id: "$subOrders.returns._id",
          orderId: "$_id",
          subOrderId: "$subOrders._id",
          userId: { $arrayElemAt: ["$userDetails", 0] },
          productId: { $arrayElemAt: ["$productDetails", 0] },
          quantity: "$subOrders.returns.quantity",
          reason: "$subOrders.returns.reason",
          status: "$subOrders.returns.status",
          requestedAt: "$subOrders.returns.requestedAt",
          approvedAt: "$subOrders.returns.approvedAt",
          refundAmount: "$subOrders.returns.refundAmount",
          returnShippingCost: "$subOrders.returns.returnShippingCost",
          images: "$subOrders.returns.images",
        },
      },
      // Sort by request date (newest first)
      {
        $sort: { requestedAt: -1 },
      },
    ];

    const returns = await Order.aggregate(pipeline);

    // Apply search filter if provided
    let filteredReturns = returns;
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase();
      filteredReturns = returns.filter(
        (returnItem: any) =>
          returnItem.productId?.name?.toLowerCase().includes(searchTerm) ||
          returnItem.userId?.email?.toLowerCase().includes(searchTerm) ||
          returnItem.orderId?.toString().toLowerCase().includes(searchTerm)
      );
    }

    // Calculate stats
    const stats = {
      total: returns.length,
      pending: returns.filter((r: any) => r.status === "Requested").length,
      approved: returns.filter((r: any) => r.status === "Approved").length,
      completed: returns.filter((r: any) =>
        ["Refunded", "Received"].includes(r.status)
      ).length,
    };

    return NextResponse.json({
      success: true,
      returns: filteredReturns,
      stats,
    });
  } catch (error) {
    console.error("Error fetching store returns:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
