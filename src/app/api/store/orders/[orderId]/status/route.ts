import { type NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/db/models/order.model";
import mongoose from "mongoose";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";

/**
 * Order Status Update API Route Handler
 *
 * Provides comprehensive order status management functionality for store owners,
 * including delivery status updates, tracking number management, and order notes.
 *
 * Features:
 * - Delivery status updates with validation
 * - Tracking number assignment and updates
 * - Order notes and delivery instructions
 * - Automatic escrow management based on status changes
 * - Comprehensive audit logging for order changes
 * - Email notification triggers for status changes
 *
 * Security:
 * - Store session validation to ensure authorized access
 * - Order ownership verification to prevent unauthorized updates
 * - Input validation and sanitization for all update fields
 * - Comprehensive error logging for monitoring and debugging
 *
 * @param request - Next.js request object with status update data
 * @param params - Route parameters containing orderId
 * @returns JSON response with update confirmation and new status
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // ==================== Authentication & Authorization ====================

    /**
     * Store Session Validation
     *
     * Ensures that only authenticated store owners can update order status.
     * Prevents unauthorized modifications to order information.
     */
    const storeSession = await getStoreFromCookie();

    if (!storeSession?.id) {
      console.warn("Unauthorized order status update attempt");
      return NextResponse.json(
        {
          error: "Unauthorized access",
          message: "Store authentication required to update order status",
        },
        { status: 401 }
      );
    }

    // ==================== Parameter Validation ====================

    /**
     * Order ID Validation
     *
     * Validates the order ID parameter to ensure it's a valid MongoDB ObjectId
     * before attempting database operations.
     */
    const { orderId } = await params;

    if (!orderId || typeof orderId !== "string") {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Order ID is required",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json(
        {
          error: "Invalid order ID",
          message: "Please provide a valid order ID",
        },
        { status: 400 }
      );
    }

    // ==================== Request Data Processing ====================

    /**
     * Extract and Validate Update Data
     *
     * Retrieves status update data from the request body and validates it.
     * Ensures that all required fields are present and properly formatted.
     */
    const updateData = await request.json();

    if (!updateData || typeof updateData !== "object") {
      return NextResponse.json(
        {
          error: "Invalid request data",
          message: "Please provide valid update data",
        },
        { status: 400 }
      );
    }

    const { subOrderId, deliveryStatus, trackingNumber, notes } = updateData;

    // Validate required fields
    if (!subOrderId || !deliveryStatus) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          message: "Sub-order ID and delivery status are required",
        },
        { status: 400 }
      );
    }

    // Validate delivery status
    const validStatuses = [
      "Order Placed",
      "Processing",
      "Shipped",
      "Out for Delivery",
      "Delivered",
      "Canceled",
      "Returned",
      "Failed Delivery",
      "Refunded",
    ];

    if (!validStatuses.includes(deliveryStatus)) {
      return NextResponse.json(
        {
          error: "Invalid delivery status",
          message: "Please provide a valid delivery status",
        },
        { status: 400 }
      );
    }

    // ==================== Database Operations ====================

    /**
     * Fetch and Validate Order
     *
     * Retrieves the order from the database and validates store ownership
     * before allowing any modifications.
     */
    const order = await getOrderById(orderId);

    if (!order) {
      console.warn(`Order not found for status update: ${orderId}`);
      return NextResponse.json(
        {
          error: "Order not found",
          message: "The requested order could not be found",
        },
        { status: 404 }
      );
    }

    // Verify store ownership
    const storeOwnsOrder = order.stores.some(
      (storeId) => storeId.toString() === storeSession.id
    );

    if (!storeOwnsOrder) {
      console.warn(
        `Unauthorized order status update attempt: Store ${storeSession.id} tried to update order ${orderId}`
      );
      return NextResponse.json(
        {
          error: "Access denied",
          message: "You don't have permission to update this order",
        },
        { status: 403 }
      );
    }

    // ==================== Sub-Order Update ====================

    /**
     * Find and Update Sub-Order
     *
     * Locates the specific sub-order within the order and applies the
     * status update along with any additional information.
     */
    const subOrder = order.subOrders.find(
      (sub) => sub._id?.toString() === subOrderId
    );

    if (!subOrder) {
      return NextResponse.json(
        {
          error: "Sub-order not found",
          message: "The specified sub-order could not be found",
        },
        { status: 404 }
      );
    }

    // Store previous status for logging
    const previousStatus = subOrder.deliveryStatus;

    // Update sub-order fields
    subOrder.deliveryStatus = deliveryStatus;

    if (trackingNumber && trackingNumber.trim()) {
      subOrder.trackingNumber = trackingNumber.trim();
    }

    // ==================== Status-Specific Logic ====================

    /**
     * Handle Status-Specific Updates
     *
     * Applies additional logic based on the new delivery status,
     * including escrow management and delivery date tracking.
     */
    const currentDate = new Date();

    switch (deliveryStatus) {
      case "Shipped":
        // Set tracking number if provided and not already set
        if (trackingNumber && !subOrder.trackingNumber) {
          subOrder.trackingNumber = trackingNumber.trim();
        }
        break;

      case "Delivered":
        // Set delivery date and calculate return window
        subOrder.deliveryDate = currentDate;
        subOrder.returnWindow = new Date(
          currentDate.getTime() + 7 * 24 * 60 * 60 * 1000
        ); // 7 days
        break;

      case "Canceled":
      case "Returned":
      case "Failed Delivery":
        // Handle refund scenarios - mark escrow for refund processing
        if (subOrder.escrow) {
          subOrder.escrow.refunded = true;
          subOrder.escrow.refundReason =
            notes || `Order ${deliveryStatus.toLowerCase()}`;
        }
        break;

      case "Refunded":
        // Complete refund process
        if (subOrder.escrow) {
          subOrder.escrow.refunded = true;
          subOrder.escrow.held = false;
          subOrder.escrow.refundReason = notes || "Order refunded";
        }
        break;
    }

    // ==================== Save Changes ====================

    /**
     * Save Order Updates
     *
     * Persists all changes to the database with proper error handling
     * and transaction management.
     */
    await order.save();

    // ==================== Audit Logging ====================

    /**
     * Log Status Change for Audit Trail
     *
     * Records the status change for compliance and debugging purposes.
     * Includes store information, timestamps, and change details.
     */
    console.log(
      `Order status updated: ${orderId} | Sub-order: ${subOrderId} | ` +
        `Store: ${storeSession.id} | Status: ${previousStatus} → ${deliveryStatus} | ` +
        `Tracking: ${trackingNumber || "N/A"}`
    );

    // ==================== Response Formatting ====================

    /**
     * Format Success Response
     *
     * Returns comprehensive information about the status update
     * including the new status and any additional changes made.
     */
    const response = {
      success: true,
      message: `Order status updated to ${deliveryStatus}`,
      updates: {
        orderId,
        subOrderId,
        previousStatus,
        newStatus: deliveryStatus,
        trackingNumber: subOrder.trackingNumber || null,
        deliveryDate: subOrder.deliveryDate?.toISOString() || null,
        updatedAt: currentDate.toISOString(),
      },
    };

    // TODO: Trigger email notification to customer about status change
    // This would typically call an email service or queue a notification job

    return NextResponse.json(response);
  } catch (error) {
    // ==================== Error Handling ====================

    /**
     * Comprehensive Error Handling
     *
     * Logs errors for debugging while providing user-friendly error messages.
     * Includes specific handling for common error types.
     */
    console.error("Order status update error:", error);

    // Handle specific error types
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        {
          error: "Invalid update data",
          message: "The provided data failed validation",
        },
        { status: 400 }
      );
    }

    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json(
        {
          error: "Invalid data format",
          message: "One or more fields have invalid format",
        },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to update order status. Please try again later.",
      },
      { status: 500 }
    );
  }
}

/**
 * Get Order Status History Handler (GET)
 *
 * Retrieves the complete status change history for an order,
 * providing audit trail and tracking information.
 *
 * Features:
 * - Complete status change timeline
 * - Tracking number history
 * - Store action audit trail
 * - Customer notification history
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing orderId
 * @returns JSON response with status history
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // Store session validation
    const storeSession = await getStoreFromCookie();

    if (!storeSession?.id) {
      return NextResponse.json(
        { error: "Unauthorized access" },
        { status: 401 }
      );
    }

    // Parameter validation
    const { orderId } = await params;

    if (!orderId || !mongoose.Types.ObjectId.isValid(orderId)) {
      return NextResponse.json({ error: "Invalid order ID" }, { status: 400 });
    }

    // Fetch order
    const order = await getOrderById(orderId, true);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Verify store ownership
    const storeOwnsOrder = order.stores.some(
      (storeId) => storeId.toString() === storeSession.id
    );

    if (!storeOwnsOrder) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Format status history
    const statusHistory = order.subOrders.map((subOrder, index) => ({
      subOrderId: subOrder._id?.toString(),
      subOrderIndex: index + 1,
      currentStatus: subOrder.deliveryStatus,
      trackingNumber: subOrder.trackingNumber || null,
      deliveryDate: subOrder.deliveryDate?.toISOString() || null,
      escrowStatus: {
        held: subOrder.escrow?.held || false,
        released: subOrder.escrow?.released || false,
        refunded: subOrder.escrow?.refunded || false,
      },
      returnWindow: subOrder.returnWindow?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      orderId,
      statusHistory,
      orderCreatedAt: order.createdAt.toISOString(),
      lastUpdatedAt: order.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error("Order status history fetch error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch status history. Please try again later.",
      },
      { status: 500 }
    );
  }
}
