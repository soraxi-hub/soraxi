import { type NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { getOrderModel, ISubOrder } from "@/lib/db/models/order.model";
import { getUserFromCookie } from "@/lib/helpers/get-user-from-cookie";
import { DeliveryStatus, StatusHistory } from "@/enums";

/**
 * @fileoverview API routes for handling product returns in e-commerce orders
 * @description Handles return requests, status updates, and refund processing
 */

/**
 * Interface for return request payload
 */
interface ReturnRequestPayload {
  orderId: string;
  subOrderId: string;
  productId: string;
  quantity: number;
  reason: string;
  userId: string;
}

/**
 * Interface for return status update payload
 */
interface ReturnStatusUpdatePayload {
  orderId: string;
  subOrderId: string;
  returnId: string;
  status: "Approved" | "Rejected" | "In-Transit" | "Received" | "Refunded";
  refundAmount?: number;
  returnShippingCost?: number;
  notes?: string;
}

/**
 * POST /api/returns
 * @description Initiates a new return request for a specific product in an order
 * @param {NextRequest} request - The incoming request object
 * @returns {NextResponse} Response with created return request or error
 */
export async function POST(request: NextRequest) {
  try {
    const body: ReturnRequestPayload = await request.json();
    const { orderId, subOrderId, productId, quantity, reason } = body;

    console.log("Processing return request:", {
      orderId,
      subOrderId,
      productId,
      quantity,
      reason,
    });

    // Validate required fields
    if (!orderId || !subOrderId || !productId || !quantity || !reason) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const user = await getUserFromCookie();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Import your Order model (adjust path as needed)
    const Order = await getOrderModel();

    // Find the order and validate ownership
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.user.toString() !== user.id) {
      return NextResponse.json(
        { error: "Unauthorized access to order" },
        { status: 403 }
      );
    }

    // Find the specific sub-order
    const subOrder = order.subOrders.find(
      (sub: any) => sub._id.toString() === subOrderId
    );

    if (!subOrder) {
      return NextResponse.json(
        { error: "Sub-order not found" },
        { status: 404 }
      );
    }

    // Validate return window (check if still within return period)
    // const currentDate = new Date();
    // if (currentDate > subOrder.returnWindow) {
    //   return NextResponse.json(
    //     { error: "Return window has expired" },
    //     { status: 400 }
    //   );
    // }

    // Validate delivery status (can only return delivered items)
    if (subOrder.deliveryStatus !== DeliveryStatus.Delivered) {
      return NextResponse.json(
        { error: "Can only return delivered items" },
        { status: 400 }
      );
    }

    // Find the product in the sub-order
    const orderItem = subOrder.products.find(
      (item) => item.Product.toString() === productId
    );

    if (!orderItem) {
      return NextResponse.json(
        { error: "Product not found in order" },
        { status: 404 }
      );
    }

    // Check if user has already initiated a return for this product
    const existingReturn =
      subOrder.returns &&
      subOrder.returns.find(
        (r) =>
          r.productId.toString() === productId &&
          r.userId.toString() === user.id
      );

    if (existingReturn) {
      return NextResponse.json(
        { error: "Return request already exists for this product" },
        { status: 400 }
      );
    }

    // Validate quantity (can't return more than ordered)
    if (quantity > orderItem.productSnapshot.quantity) {
      return NextResponse.json(
        { error: "Cannot return more items than ordered" },
        { status: 400 }
      );
    }

    // Calculate refund amount (product price * quantity)
    const refundAmount = orderItem.productSnapshot.price * quantity;

    // Create return request object
    const returnRequest = {
      _id: new mongoose.Types.ObjectId() as unknown as mongoose.Schema.Types.ObjectId,
      userId: new mongoose.Types.ObjectId(
        user.id
      ) as unknown as mongoose.Schema.Types.ObjectId,
      productId: new mongoose.Types.ObjectId(
        productId
      ) as unknown as mongoose.Schema.Types.ObjectId,
      quantity,
      reason,
      status: "Requested" as NonNullable<
        ISubOrder["returns"]
      >[number]["status"],
      requestedAt: new Date(),
      refundAmount,
    };

    // Initialize returns array if it doesn't exist
    if (!subOrder.returns) {
      subOrder.returns = [];
    }

    // Add return request to sub-order
    subOrder.returns.push(returnRequest);

    // Add status history entry
    subOrder.statusHistory.push({
      status: StatusHistory.ReturnRequested,
      timestamp: new Date(),
      notes: `Return requested for ${quantity} unit(s) of product. Reason: ${reason}`,
    });

    // Save the updated order
    await order.save();

    // TODO: Send notification to store owner about return request
    // TODO: Send confirmation email to customer

    return NextResponse.json(
      {
        success: true,
        message: "Return request submitted successfully",
        returnId: returnRequest._id,
        data: returnRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error processing return request:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/returns
 * @description Updates the status of an existing return request
 * @param {NextRequest} request - The incoming request object
 * @returns {NextResponse} Response with updated return status or error
 */
export async function PUT(request: NextRequest) {
  try {
    const body: ReturnStatusUpdatePayload = await request.json();
    const {
      orderId,
      subOrderId,
      returnId,
      status,
      refundAmount,
      returnShippingCost,
      // notes,
    } = body;

    // Validate required fields
    if (!orderId || !subOrderId || !returnId || !status) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate status value
    const validStatuses = [
      "Approved",
      "Rejected",
      "In-Transit",
      "Received",
      "Refunded",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Import your Order model
    const Order = await getOrderModel();

    // Find the order
    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Find the sub-order
    const subOrder = order.subOrders.find(
      (sub) => sub._id.toString() === subOrderId
    );

    if (!subOrder) {
      return NextResponse.json(
        { error: "Sub-order not found" },
        { status: 404 }
      );
    }

    // Find the return request
    const returnRequest = subOrder.returns?.find(
      (ret) => ret._id.toString() === returnId
    );

    if (!returnRequest) {
      return NextResponse.json(
        { error: "Return request not found" },
        { status: 404 }
      );
    }

    // Update return status and related fields
    returnRequest.status = status;

    if (status === "Approved") {
      returnRequest.approvedAt = new Date();
    }

    if (refundAmount !== undefined) {
      returnRequest.refundAmount = refundAmount;
    }

    if (returnShippingCost !== undefined) {
      returnRequest.returnShippingCost = returnShippingCost;
    }

    // Handle refund processing
    if (status === "Refunded") {
      // Update escrow information
      subOrder.escrow.refunded = true;
      subOrder.escrow.refundReason = returnRequest.reason;

      // Update delivery status if all items are returned
      const totalReturnedQuantity = subOrder.returns
        ?.filter((ret) => ret.status === "Refunded")
        .reduce((sum: number, ret) => sum + ret.quantity, 0);

      const totalOrderedQuantity = subOrder.products.reduce(
        (sum: number, product) => sum + product.productSnapshot.quantity,
        0
      );

      if (totalReturnedQuantity === totalOrderedQuantity) {
        subOrder.deliveryStatus = DeliveryStatus.Refunded;
      }
    }

    // Add status history entry
    // const statusMessages = {
    //   Approved: "Return request approved",
    //   Rejected: "Return request rejected",
    //   "In-Transit": "Return package in transit to store",
    //   Received: "Return package received by store",
    //   Refunded: "Refund processed successfully",
    // };

    // subOrder.statusHistory.push({
    //   status: status,
    //   timestamp: new Date(),
    //   notes:
    //     notes ||
    //     `${
    //       statusMessages[status as keyof typeof statusMessages]
    //     }. Return status updated to ${status}`,
    // });

    // Save the updated order
    await order.save();

    // TODO: Send notification emails based on status
    // TODO: Process actual payment refund if status is 'refunded'
    // TODO: Update product inventory if return is received

    return NextResponse.json({
      success: true,
      message: `Return status updated to ${status}`,
      data: returnRequest,
    });
  } catch (error) {
    console.error("Error updating return status:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/returns?orderId=xxx&subOrderId=xxx
 * @description Retrieves return information for a specific sub-order
 * @param {NextRequest} request - The incoming request object
 * @returns {NextResponse} Response with return data or error
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const subOrderId = searchParams.get("subOrderId");
    const userId = searchParams.get("userId"); // For authorization

    if (!orderId || !subOrderId) {
      return NextResponse.json(
        { error: "Missing orderId or subOrderId parameters" },
        { status: 400 }
      );
    }

    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI!);

    // Import your Order model
    const Order = await getOrderModel();

    // Find the order
    const order = await Order.findById(orderId).populate(
      "subOrders.products.Product"
    );
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Validate ownership if userId is provided
    if (userId && order.user.toString() !== userId) {
      return NextResponse.json(
        { error: "Unauthorized access to order" },
        { status: 403 }
      );
    }

    // Find the sub-order
    const subOrder = order.subOrders.find(
      (sub) => sub._id.toString() === subOrderId
    );

    if (!subOrder) {
      return NextResponse.json(
        { error: "Sub-order not found" },
        { status: 404 }
      );
    }

    // Return the returns data along with relevant order information
    return NextResponse.json({
      success: true,
      data: {
        orderId,
        subOrderId,
        returns: subOrder.returns || [],
        returnWindow: subOrder.returnWindow,
        deliveryStatus: subOrder.deliveryStatus,
        canReturn:
          new Date() <= subOrder.returnWindow &&
          subOrder.deliveryStatus === DeliveryStatus.Delivered,
        products: subOrder.products, // Include items for reference
      },
    });
  } catch (error) {
    console.error("Error retrieving return information:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
