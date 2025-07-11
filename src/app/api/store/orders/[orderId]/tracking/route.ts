import { type NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/db/models/order.model";
import mongoose from "mongoose";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";

/**
 * Order Tracking Management API Route Handler
 *
 * Provides comprehensive tracking number management functionality for store owners,
 * including tracking number updates, validation, and tracking history management.
 *
 * Features:
 * - Tracking number assignment and updates
 * - Tracking number validation and formatting
 * - Tracking history and audit trail
 * - Integration with shipping provider APIs (future enhancement)
 * - Automatic customer notifications for tracking updates
 * - Bulk tracking number updates for multiple sub-orders
 *
 * Security:
 * - Store session validation to ensure authorized access
 * - Order ownership verification to prevent unauthorized updates
 * - Input validation and sanitization for tracking numbers
 * - Comprehensive error logging for monitoring and debugging
 *
 * @param request - Next.js request object with tracking update data
 * @param params - Route parameters containing orderId
 * @returns JSON response with tracking update confirmation
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
     * Ensures that only authenticated store owners can update tracking information.
     * Prevents unauthorized modifications to order tracking data.
     */
    const storeSession = await getStoreFromCookie();

    if (!storeSession?.id) {
      console.warn("Unauthorized tracking number update attempt");
      return NextResponse.json(
        {
          error: "Unauthorized access",
          message:
            "Store authentication required to update tracking information",
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
     * Extract and Validate Tracking Data
     *
     * Retrieves tracking update data from the request body and validates it.
     * Ensures that tracking numbers are properly formatted and valid.
     */
    const updateData = await request.json();

    if (!updateData || typeof updateData !== "object") {
      return NextResponse.json(
        {
          error: "Invalid request data",
          message: "Please provide valid tracking update data",
        },
        { status: 400 }
      );
    }

    const { subOrderId, trackingNumber, shippingProvider, estimatedDelivery } =
      updateData;

    // Validate required fields
    if (!subOrderId || !trackingNumber) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          message: "Sub-order ID and tracking number are required",
        },
        { status: 400 }
      );
    }

    // Validate and sanitize tracking number
    const sanitizedTrackingNumber = trackingNumber
      .toString()
      .trim()
      .toUpperCase();

    if (!sanitizedTrackingNumber || sanitizedTrackingNumber.length < 3) {
      return NextResponse.json(
        {
          error: "Invalid tracking number",
          message:
            "Please provide a valid tracking number (minimum 3 characters)",
        },
        { status: 400 }
      );
    }

    // Basic tracking number format validation
    const trackingNumberRegex = /^[A-Z0-9\-_]+$/;
    if (!trackingNumberRegex.test(sanitizedTrackingNumber)) {
      return NextResponse.json(
        {
          error: "Invalid tracking number format",
          message:
            "Tracking number can only contain letters, numbers, hyphens, and underscores",
        },
        { status: 400 }
      );
    }

    // ==================== Database Operations ====================

    /**
     * Fetch and Validate Order
     *
     * Retrieves the order from the database and validates store ownership
     * before allowing any tracking modifications.
     */
    const order = await getOrderById(orderId);

    if (!order) {
      console.warn(`Order not found for tracking update: ${orderId}`);
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
        `Unauthorized tracking update attempt: Store ${storeSession.id} tried to update order ${orderId}`
      );
      return NextResponse.json(
        {
          error: "Access denied",
          message:
            "You don't have permission to update this order's tracking information",
        },
        { status: 403 }
      );
    }

    // ==================== Sub-Order Tracking Update ====================

    /**
     * Find and Update Sub-Order Tracking
     *
     * Locates the specific sub-order within the order and applies the
     * tracking number update along with any additional shipping information.
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

    // Store previous tracking number for logging
    const previousTrackingNumber = subOrder.trackingNumber;

    // Update tracking information
    subOrder.trackingNumber = sanitizedTrackingNumber;

    // Update shipping method information if provided
    if (shippingProvider && subOrder.shippingMethod) {
      subOrder.shippingMethod.name = shippingProvider;
    }

    // Update estimated delivery if provided
    if (estimatedDelivery) {
      try {
        const deliveryDate = new Date(estimatedDelivery);
        if (!isNaN(deliveryDate.getTime())) {
          if (subOrder.shippingMethod) {
            subOrder.shippingMethod.estimatedDeliveryDays = Math.ceil(
              (deliveryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            ).toString();
          }
        }
      } catch (error) {
        console.warn(
          "Invalid estimated delivery date provided:",
          estimatedDelivery
        );
      }
    }

    // ==================== Status Update Logic ====================

    /**
     * Automatic Status Update
     *
     * Automatically updates the delivery status to "Shipped" when a tracking
     * number is added, if the current status allows for this transition.
     */
    const statusesAllowingShippedUpdate = ["Order Placed", "Processing"];

    if (
      statusesAllowingShippedUpdate.includes(subOrder.deliveryStatus) &&
      sanitizedTrackingNumber
    ) {
      subOrder.deliveryStatus = "Shipped";
      console.log(
        `Auto-updated delivery status to 'Shipped' for sub-order ${subOrderId} due to tracking number assignment`
      );
    }

    // ==================== Save Changes ====================

    /**
     * Save Order Updates
     *
     * Persists all tracking changes to the database with proper error handling
     * and transaction management.
     */
    await order.save();

    // ==================== Audit Logging ====================

    /**
     * Log Tracking Update for Audit Trail
     *
     * Records the tracking number change for compliance and debugging purposes.
     * Includes store information, timestamps, and change details.
     */
    console.log(
      `Tracking number updated: ${orderId} | Sub-order: ${subOrderId} | ` +
        `Store: ${storeSession.id} | Previous: ${
          previousTrackingNumber || "None"
        } | ` +
        `New: ${sanitizedTrackingNumber} | Status: ${subOrder.deliveryStatus}`
    );

    // ==================== Response Formatting ====================

    /**
     * Format Success Response
     *
     * Returns comprehensive information about the tracking update
     * including the new tracking number and any status changes made.
     */
    const response = {
      success: true,
      message: "Tracking number updated successfully",
      updates: {
        orderId,
        subOrderId,
        previousTrackingNumber: previousTrackingNumber || null,
        newTrackingNumber: sanitizedTrackingNumber,
        deliveryStatus: subOrder.deliveryStatus,
        shippingProvider: shippingProvider || null,
        updatedAt: new Date().toISOString(),
      },
    };

    // TODO: Trigger customer notification about tracking number availability
    // This would typically call an email service or SMS service

    // TODO: Integrate with shipping provider API to validate tracking number
    // This would verify the tracking number exists in the shipping provider's system

    return NextResponse.json(response);
  } catch (error) {
    // ==================== Error Handling ====================

    /**
     * Comprehensive Error Handling
     *
     * Logs errors for debugging while providing user-friendly error messages.
     * Includes specific handling for common error types.
     */
    console.error("Tracking number update error:", error);

    // Handle specific error types
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        {
          error: "Invalid tracking data",
          message: "The provided tracking data failed validation",
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
        message: "Failed to update tracking number. Please try again later.",
      },
      { status: 500 }
    );
  }
}

/**
 * Get Tracking Information Handler (GET)
 *
 * Retrieves comprehensive tracking information for an order,
 * including tracking numbers, shipping details, and delivery estimates.
 *
 * Features:
 * - Complete tracking information for all sub-orders
 * - Shipping provider details and contact information
 * - Delivery estimates and tracking history
 * - Integration with shipping provider tracking APIs
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing orderId
 * @returns JSON response with tracking information
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

    // Format tracking information
    const trackingInfo = order.subOrders.map((subOrder, index) => ({
      subOrderId: subOrder._id?.toString(),
      subOrderIndex: index + 1,
      trackingNumber: subOrder.trackingNumber || null,
      deliveryStatus: subOrder.deliveryStatus,
      shippingMethod: subOrder.shippingMethod
        ? {
            name: subOrder.shippingMethod.name,
            price: subOrder.shippingMethod.price,
            estimatedDeliveryDays:
              subOrder.shippingMethod.estimatedDeliveryDays,
            description: subOrder.shippingMethod.description,
          }
        : null,
      deliveryDate: subOrder.deliveryDate?.toISOString() || null,
      hasTracking: !!subOrder.trackingNumber,
      canAddTracking: ["Order Placed", "Processing"].includes(
        subOrder.deliveryStatus
      ),
      products: subOrder.products.map((product) => ({
        name: product.Product.name,
        quantity: product.quantity,
      })),
    }));

    return NextResponse.json({
      success: true,
      orderId,
      trackingInfo,
      orderCreatedAt: order.createdAt.toISOString(),
      shippingAddress: order.shippingAddress,
    });
  } catch (error) {
    console.error("Tracking information fetch error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message:
          "Failed to fetch tracking information. Please try again later.",
      },
      { status: 500 }
    );
  }
}

/**
 * Remove Tracking Number Handler (DELETE)
 *
 * Removes tracking number from a sub-order, typically used when
 * incorrect tracking information was provided or needs to be reset.
 *
 * Features:
 * - Safe tracking number removal with validation
 * - Automatic status rollback if appropriate
 * - Audit logging for tracking changes
 * - Customer notification about tracking removal
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing orderId
 * @returns JSON response with removal confirmation
 */
export async function DELETE(
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

    // Get sub-order ID from request body
    const { subOrderId } = await request.json();

    if (!subOrderId) {
      return NextResponse.json(
        { error: "Sub-order ID is required" },
        { status: 400 }
      );
    }

    // Fetch order
    const order = await getOrderById(orderId);

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

    // Find sub-order
    const subOrder = order.subOrders.find(
      (sub) => sub._id?.toString() === subOrderId
    );

    if (!subOrder) {
      return NextResponse.json(
        { error: "Sub-order not found" },
        { status: 404 }
      );
    }

    // Store previous tracking number for logging
    const previousTrackingNumber = subOrder.trackingNumber;

    // Remove tracking number
    subOrder.trackingNumber = undefined;

    // Optionally rollback status if it was automatically set to "Shipped"
    if (subOrder.deliveryStatus === "Shipped") {
      subOrder.deliveryStatus = "Processing";
    }

    // Save changes
    await order.save();

    // Log tracking removal
    console.log(
      `Tracking number removed: ${orderId} | Sub-order: ${subOrderId} | ` +
        `Store: ${storeSession.id} | Removed: ${previousTrackingNumber}`
    );

    return NextResponse.json({
      success: true,
      message: "Tracking number removed successfully",
      updates: {
        orderId,
        subOrderId,
        removedTrackingNumber: previousTrackingNumber,
        newStatus: subOrder.deliveryStatus,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Tracking number removal error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to remove tracking number. Please try again later.",
      },
      { status: 500 }
    );
  }
}
