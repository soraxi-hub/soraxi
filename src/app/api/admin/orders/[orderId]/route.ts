import { type NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/db/models/order.model";
import { getAdminFromRequest } from "@/lib/admin/permissions";
import {
  logAdminAction,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
} from "@/lib/admin/audit-logger";
import mongoose from "mongoose";
import { Role } from "@/modules/shared/roles";

/**
 * Admin Order Detail API Route Handler
 *
 * Provides comprehensive order detail retrieval functionality for platform administrators,
 * including complete order information with all related data populated.
 *
 * Features:
 * - Complete order detail retrieval with full population
 * - Comprehensive error handling and logging
 * - Performance optimization with selective field projection
 * - Type-safe data formatting for client consumption
 *
 * Security:
 * - Admin authentication and authorization
 * - Input validation and sanitization
 * - Comprehensive error logging for monitoring
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing orderId
 * @returns JSON response with complete order details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    // ==================== Authentication & Authorization ====================

    /**
     * Admin Authentication Check
     *
     * Verifies that the request is coming from an authenticated admin user
     * with appropriate permissions to view detailed order data.
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
     * before attempting database queries.
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

    // ==================== Database Query ====================

    /**
     * Fetch Order with Complete Population
     *
     * Retrieves the order with all related documents populated including:
     * - User information (customer details)
     * - Product information (names, images, pricing)
     * - Store information (for sub-orders)
     * - Complete sub-order details with escrow and shipping info
     */
    const order = await getOrderById(orderId, true);

    if (!order) {
      return NextResponse.json(
        {
          error: "Order not found",
          message: "The requested order could not be found",
        },
        { status: 404 }
      );
    }

    // ==================== Data Formatting ====================

    /**
     * Format Order Data for Client
     *
     * Transforms the raw MongoDB document into a properly formatted
     * object suitable for client consumption with type safety.
     */
    const formattedOrder = {
      _id: order._id.toString(),
      orderNumber: `ORD-${order._id.toString().substring(0, 8).toUpperCase()}`,
      user: {
        _id: order.user._id?.toString() || "",
        name: order.user
          ? `${order.user.firstName} ${order.user.lastName}`
          : "Unknown Customer",
        email: order.user?.email || "",
        phone: order.user?.phoneNumber || null,
      },
      totalAmount: order.totalAmount,
      paymentStatus: order.paymentStatus || "Unknown",
      paymentMethod: order.paymentMethod || "Unknown",
      shippingAddress: {
        postalCode: order.shippingAddress?.postalCode || "",
        address: order.shippingAddress?.address || "",
      },
      notes: order.notes || null,
      discount: order.discount || 0,
      taxAmount: order.taxAmount || 0,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      subOrders: order.subOrders.map((subOrder) => ({
        _id: subOrder._id?.toString() || "",
        store: {
          _id: subOrder.store._id?.toString() || "",
          name: subOrder.store?.name || "Unknown Store",
          email: subOrder.store?.storeEmail || "",
        },
        products: subOrder.products.map((product) => ({
          Product: {
            _id: product.Product._id?.toString() || "",
            name: product.Product?.name || "Unknown Product",
            images: product.Product?.images || [],
            price: product.Product?.price || 0,
            productType: product.Product?.productType || "Product",
          },
          quantity: product.quantity,
          price: product.price,
          selectedSize: product.selectedSize || null,
        })),
        totalAmount: subOrder.totalAmount,
        deliveryStatus: subOrder.deliveryStatus,
        shippingMethod: subOrder.shippingMethod || null,
        trackingNumber: subOrder.trackingNumber || null,
        deliveryDate: subOrder.deliveryDate?.toISOString() || null,
        customerConfirmedDelivery: {
          confirmed: subOrder.customerConfirmedDelivery?.confirmed || false,
          confirmedAt:
            subOrder.customerConfirmedDelivery?.confirmedAt?.toISOString() ||
            null,
          autoConfirmed:
            subOrder.customerConfirmedDelivery?.autoConfirmed || false,
        },
        escrow: {
          held: subOrder.escrow?.held || false,
          released: subOrder.escrow?.released || false,
          releasedAt: subOrder.escrow?.releasedAt?.toISOString() || null,
          refunded: subOrder.escrow?.refunded || false,
          refundReason: subOrder.escrow?.refundReason || null,
        },
        returnWindow: subOrder.returnWindow?.toISOString() || null,
      })),
    };

    // ==================== Audit Logging ====================

    /**
     * Log Admin Action
     *
     * Records the admin's detailed order viewing action for audit purposes.
     */
    await logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      adminRoles: admin.roles as Role[],
      action: AUDIT_ACTIONS.ORDER_VIEWED,
      module: AUDIT_MODULES.ORDERS,
      resourceId: orderId,
      resourceType: "order",
      details: {
        viewType: "detailed",
        orderNumber: formattedOrder.orderNumber,
      },
    });

    // ==================== Response ====================

    /**
     * Return Formatted Response
     *
     * Sends back the formatted order details.
     */
    return NextResponse.json({
      success: true,
      order: formattedOrder,
    });
  } catch (error) {
    // ==================== Error Handling ====================

    /**
     * Comprehensive Error Handling
     *
     * Logs errors for debugging while providing user-friendly error messages.
     * Includes specific handling for common error types.
     */
    console.error("Admin order detail fetch error:", error);

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
          error: "Invalid order ID format",
          message: "Please provide a valid order ID",
        },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch order details. Please try again later.",
      },
      { status: 500 }
    );
  }
}
