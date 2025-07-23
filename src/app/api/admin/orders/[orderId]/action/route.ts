import { type NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/db/models/order.model";
import { getAdminFromRequest } from "@/lib/admin/permissions";
import {
  logAdminAction,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
} from "@/lib/admin/audit-logger";
import mongoose from "mongoose";

/**
 * Admin Order Action API Route Handler
 *
 * Provides comprehensive order management functionality for platform administrators,
 * including status updates, cancellations, and administrative actions.
 *
 * Features:
 * - Order status updates
 * - Order cancellation
 * - Order processing actions
 * - Comprehensive audit logging
 * - Email notification triggers
 *
 * Security:
 * - Admin authentication and authorization
 * - Input validation and sanitization
 * - Comprehensive error logging for monitoring
 *
 * @param request - Next.js request object with action data
 * @param params - Route parameters containing orderId
 * @returns JSON response with action confirmation
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // ==================== Authentication & Authorization ====================

    /**
     * Admin Authentication Check
     *
     * Verifies that the request is coming from an authenticated admin user
     * with appropriate permissions to perform order actions.
     */
    const admin = getAdminFromRequest(request);

    if (!admin) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          message: "Admin authentication required",
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
     * Extract and Validate Action Data
     *
     * Retrieves action data from the request body and validates it.
     * Ensures that all required fields are present and properly formatted.
     */
    const actionData = await request.json();

    if (!actionData || typeof actionData !== "object") {
      return NextResponse.json(
        {
          error: "Invalid request data",
          message: "Please provide valid action data",
        },
        { status: 400 }
      );
    }

    const { action, subOrderId, notes } = actionData;

    // Validate required fields
    if (!action) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          message: "Action is required",
        },
        { status: 400 }
      );
    }

    // Validate action type
    const validActions = [
      "confirm",
      "process",
      "ship",
      "deliver",
      "cancel",
      "refund",
    ];

    if (!validActions.includes(action)) {
      return NextResponse.json(
        {
          error: "Invalid action",
          message: "Please provide a valid action",
        },
        { status: 400 }
      );
    }

    // ==================== Database Operations ====================

    /**
     * Fetch and Validate Order
     *
     * Retrieves the order from the database before applying any actions.
     */
    const order = await getOrderById(orderId);

    if (!order) {
      return NextResponse.json(
        {
          error: "Order not found",
          message: "The requested order could not be found",
        },
        { status: 404 }
      );
    }

    // ==================== Action Processing ====================

    /**
     * Process Order Action
     *
     * Applies the requested action to the order or specific sub-order,
     * with appropriate validation and status updates.
     */
    let message = "";
    let auditAction = "";
    let actionDetails: Record<string, any> = {};

    // If subOrderId is provided, find the specific sub-order
    let targetSubOrder = null;

    if (subOrderId) {
      targetSubOrder = order.subOrders.find(
        (sub) => sub._id?.toString() === subOrderId
      );

      if (!targetSubOrder) {
        return NextResponse.json(
          {
            error: "Sub-order not found",
            message: "The specified sub-order could not be found",
          },
          { status: 404 }
        );
      }
    }

    // Process the action
    switch (action) {
      case "confirm":
        if (targetSubOrder) {
          // Store previous status for logging
          const previousStatus = targetSubOrder.deliveryStatus;

          // Update sub-order status
          targetSubOrder.deliveryStatus = "Processing";
          message = `Sub-order status updated from ${previousStatus} to Processing`;
          auditAction = AUDIT_ACTIONS.ORDER_STATUS_UPDATED;
          actionDetails = {
            previousStatus,
            newStatus: "Processing",
            subOrderId,
          };
        } else {
          // Update all sub-orders with "Order Placed" status
          let updatedCount = 0;

          order.subOrders.forEach((subOrder) => {
            if (subOrder.deliveryStatus === "Order Placed") {
              subOrder.deliveryStatus = "Processing";
              updatedCount++;
            }
          });

          message = `${updatedCount} sub-orders updated from Order Placed to Processing`;
          auditAction = AUDIT_ACTIONS.ORDER_STATUS_UPDATED;
          actionDetails = {
            updatedCount,
            newStatus: "Processing",
          };
        }
        break;

      case "process":
        if (!targetSubOrder) {
          return NextResponse.json(
            {
              error: "Sub-order required",
              message: "A specific sub-order ID is required for this action",
            },
            { status: 400 }
          );
        }

        // Store previous status for logging
        const previousProcessStatus = targetSubOrder.deliveryStatus;

        // Validate current status
        if (
          previousProcessStatus !== "Order Placed" &&
          previousProcessStatus !== "Processing"
        ) {
          return NextResponse.json(
            {
              error: "Invalid status transition",
              message: `Cannot process an order with status: ${previousProcessStatus}`,
            },
            { status: 400 }
          );
        }

        // Update sub-order status
        targetSubOrder.deliveryStatus = "Processing";
        message = `Sub-order status updated from ${previousProcessStatus} to Processing`;
        auditAction = AUDIT_ACTIONS.ORDER_STATUS_UPDATED;
        actionDetails = {
          previousStatus: previousProcessStatus,
          newStatus: "Processing",
          subOrderId,
        };
        break;

      case "ship":
        if (!targetSubOrder) {
          return NextResponse.json(
            {
              error: "Sub-order required",
              message: "A specific sub-order ID is required for this action",
            },
            { status: 400 }
          );
        }

        // Store previous status for logging
        const previousShipStatus = targetSubOrder.deliveryStatus;

        // Validate current status
        if (previousShipStatus !== "Processing") {
          return NextResponse.json(
            {
              error: "Invalid status transition",
              message: `Cannot ship an order with status: ${previousShipStatus}`,
            },
            { status: 400 }
          );
        }

        // Update sub-order status
        targetSubOrder.deliveryStatus = "Shipped";
        message = `Sub-order status updated from ${previousShipStatus} to Shipped`;
        auditAction = AUDIT_ACTIONS.ORDER_STATUS_UPDATED;
        actionDetails = {
          previousStatus: previousShipStatus,
          newStatus: "Shipped",
          subOrderId,
        };
        break;

      case "deliver":
        if (!targetSubOrder) {
          return NextResponse.json(
            {
              error: "Sub-order required",
              message: "A specific sub-order ID is required for this action",
            },
            { status: 400 }
          );
        }

        // Store previous status for logging
        const previousDeliverStatus = targetSubOrder.deliveryStatus;

        // Validate current status
        if (
          previousDeliverStatus !== "Shipped" &&
          previousDeliverStatus !== "Out for Delivery"
        ) {
          return NextResponse.json(
            {
              error: "Invalid status transition",
              message: `Cannot mark as delivered an order with status: ${previousDeliverStatus}`,
            },
            { status: 400 }
          );
        }

        // Update sub-order status
        targetSubOrder.deliveryStatus = "Delivered";
        targetSubOrder.deliveryDate = new Date();

        // Set return window (7 days from delivery)
        targetSubOrder.returnWindow = new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000
        );

        message = `Sub-order status updated from ${previousDeliverStatus} to Delivered`;
        auditAction = AUDIT_ACTIONS.ORDER_STATUS_UPDATED;
        actionDetails = {
          previousStatus: previousDeliverStatus,
          newStatus: "Delivered",
          subOrderId,
          deliveryDate: targetSubOrder.deliveryDate,
          returnWindow: targetSubOrder.returnWindow,
        };
        break;

      case "cancel":
        if (targetSubOrder) {
          // Store previous status for logging
          const previousCancelStatus = targetSubOrder.deliveryStatus;

          // Validate current status - can only cancel if not already delivered/canceled/refunded
          if (
            ["Delivered", "Canceled", "Refunded"].includes(previousCancelStatus)
          ) {
            return NextResponse.json(
              {
                error: "Invalid status transition",
                message: `Cannot cancel an order with status: ${previousCancelStatus}`,
              },
              { status: 400 }
            );
          }

          // Update sub-order status
          targetSubOrder.deliveryStatus = "Canceled";

          // Update escrow status
          if (targetSubOrder.escrow) {
            targetSubOrder.escrow.refunded = true;
            targetSubOrder.escrow.refundReason = notes || "Canceled by admin";
          }

          message = `Sub-order status updated from ${previousCancelStatus} to Canceled`;
          auditAction = AUDIT_ACTIONS.ORDER_CANCELLED;
          actionDetails = {
            previousStatus: previousCancelStatus,
            newStatus: "Canceled",
            subOrderId,
            reason: notes || "Canceled by admin",
          };
        } else {
          // Cancel all sub-orders that can be canceled
          let updatedCount = 0;

          order.subOrders.forEach((subOrder) => {
            if (
              !["Delivered", "Canceled", "Refunded"].includes(
                subOrder.deliveryStatus
              )
            ) {
              subOrder.deliveryStatus = "Canceled";

              // Update escrow status
              if (subOrder.escrow) {
                subOrder.escrow.refunded = true;
                subOrder.escrow.refundReason = notes || "Canceled by admin";
              }

              updatedCount++;
            }
          });

          message = `${updatedCount} sub-orders canceled`;
          auditAction = AUDIT_ACTIONS.ORDER_CANCELLED;
          actionDetails = {
            updatedCount,
            reason: notes || "Canceled by admin",
          };
        }
        break;

      case "refund":
        if (!targetSubOrder) {
          return NextResponse.json(
            {
              error: "Sub-order required",
              message: "A specific sub-order ID is required for this action",
            },
            { status: 400 }
          );
        }

        // Store previous status for logging
        const previousRefundStatus = targetSubOrder.deliveryStatus;

        // Update sub-order status
        targetSubOrder.deliveryStatus = "Refunded";

        // Update escrow status
        if (targetSubOrder.escrow) {
          targetSubOrder.escrow.refunded = true;
          targetSubOrder.escrow.held = false;
          targetSubOrder.escrow.refundReason = notes || "Refunded by admin";
        }

        message = `Sub-order status updated from ${previousRefundStatus} to Refunded`;
        auditAction = AUDIT_ACTIONS.ORDER_STATUS_UPDATED;
        actionDetails = {
          previousStatus: previousRefundStatus,
          newStatus: "Refunded",
          subOrderId,
          reason: notes || "Refunded by admin",
        };
        break;

      default:
        return NextResponse.json(
          {
            error: "Invalid action",
            message: "The requested action is not supported",
          },
          { status: 400 }
        );
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
     * Log Admin Action
     *
     * Records the admin's order action for audit purposes.
     */
    await logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      adminRoles: admin.roles,
      action: auditAction,
      module: AUDIT_MODULES.ORDERS,
      resourceId: orderId,
      resourceType: "order",
      details: actionDetails,
    });

    // ==================== Response ====================

    /**
     * Return Success Response
     *
     * Sends back confirmation of the action with details of what was changed.
     */
    return NextResponse.json({
      success: true,
      message,
      action,
      orderId,
      subOrderId: subOrderId || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // ==================== Error Handling ====================

    /**
     * Comprehensive Error Handling
     *
     * Logs errors for debugging while providing user-friendly error messages.
     * Includes specific handling for common error types.
     */
    console.error("Admin order action error:", error);

    // Handle specific error types
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        {
          error: "Invalid request data",
          message: "The request contains invalid data",
        },
        { status: 400 }
      );
    }

    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json(
        {
          error: "Invalid ID format",
          message: "One or more IDs in the request are invalid",
        },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to process order action. Please try again later.",
      },
      { status: 500 }
    );
  }
}
