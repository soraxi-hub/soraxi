import { type NextRequest, NextResponse } from "next/server";
import { getOrderById } from "@/lib/db/models/order.model";
import mongoose from "mongoose";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";

/**
 * Individual Store Order API Route Handler
 *
 * Provides comprehensive order detail retrieval functionality for store owners,
 * including complete order information with all related data populated.
 *
 * Features:
 * - Complete order detail retrieval with full population
 * - Store ownership validation for security
 * - Comprehensive error handling and logging
 * - Performance optimization with selective field projection
 * - Type-safe data formatting for client consumption
 *
 * Security:
 * - Store session validation to ensure authorized access
 * - Order ownership verification to prevent unauthorized access
 * - Input validation and sanitization
 * - Comprehensive error logging for monitoring
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing orderId
 * @returns JSON response with complete order details
 */
// export async function GET(
//   request: NextRequest,
//   { params }: { params: Promise<{ orderId: string }> }
// ) {
//   try {
//     // ==================== Authentication & Authorization ====================

//     /**
//      * Store Session Validation
//      *
//      * Ensures that only authenticated store owners can access order details.
//      * Prevents unauthorized access to sensitive order information.
//      */
//     const storeSession = await getStoreFromCookie();

//     if (!storeSession?.id) {
//       console.warn("Unauthorized order detail access attempt");
//       return NextResponse.json(
//         {
//           error: "Unauthorized access",
//           message: "Store authentication required to access order details",
//         },
//         { status: 401 }
//       );
//     }

//     // ==================== Parameter Validation ====================

//     /**
//      * Order ID Validation
//      *
//      * Validates the order ID parameter to ensure it's a valid MongoDB ObjectId
//      * before attempting database queries.
//      */
//     const { orderId } = await params;

//     if (!orderId || typeof orderId !== "string") {
//       return NextResponse.json(
//         {
//           error: "Invalid request",
//           message: "Order ID is required",
//         },
//         { status: 400 }
//       );
//     }

//     if (!mongoose.Types.ObjectId.isValid(orderId)) {
//       return NextResponse.json(
//         {
//           error: "Invalid order ID",
//           message: "Please provide a valid order ID",
//         },
//         { status: 400 }
//       );
//     }

//     // ==================== Database Query ====================

//     /**
//      * Fetch Order with Complete Population
//      *
//      * Retrieves the order with all related documents populated including:
//      * - User information (customer details)
//      * - Product information (names, images, pricing)
//      * - Store information (for sub-orders)
//      * - Complete sub-order details with escrow and shipping info
//      */
//     const order = await getOrderById(orderId, true);

//     if (!order) {
//       console.warn(`Order not found: ${orderId}`);
//       return NextResponse.json(
//         {
//           error: "Order not found",
//           message: "The requested order could not be found",
//         },
//         { status: 404 }
//       );
//     }

//     // ==================== Authorization Check ====================

//     /**
//      * Store Ownership Verification
//      *
//      * Ensures that the authenticated store owns this order by checking
//      * if the store ID is included in the order's stores array.
//      */
//     const storeOwnsOrder = order.stores.some(
//       (storeId) => storeId.toString() === storeSession.id
//     );

//     if (!storeOwnsOrder) {
//       console.warn(
//         `Unauthorized order access attempt: Store ${storeSession.id} tried to access order ${orderId}`
//       );
//       return NextResponse.json(
//         {
//           error: "Access denied",
//           message: "You don't have permission to access this order",
//         },
//         { status: 403 }
//       );
//     }

//     // ==================== Data Formatting ====================

//     /**
//      * Format Order Data for Client
//      *
//      * Transforms the raw MongoDB document into a properly formatted
//      * object suitable for client consumption with type safety.
//      */
//     const formattedOrder = {
//       _id: order._id.toString(),
//       user: {
//         _id: order.user._id?.toString() || "",
//         name:
//           `${order.user.firstName} ${order.user.lastName}` ||
//           "Unknown Customer",
//         email: order.user.email || "",
//         phone: order.user.phoneNumber || null,
//       },
//       totalAmount: order.totalAmount,
//       paymentStatus: order.paymentStatus || "Unknown",
//       paymentMethod: order.paymentMethod || "Unknown",
//       shippingAddress: {
//         postalCode: order.shippingAddress?.postalCode || "",
//         address: order.shippingAddress?.address || "",
//       },
//       notes: order.notes || null,
//       discount: order.discount || 0,
//       taxAmount: order.taxAmount || 0,
//       createdAt: order.createdAt.toISOString(),
//       updatedAt: order.updatedAt.toISOString(),
//       subOrders: order.subOrders.map((subOrder) => ({
//         _id: subOrder._id?.toString() || "",
//         store: subOrder.store._id?.toString() || "",
//         products: subOrder.products.map((product) => ({
//           Product: {
//             _id: product.Product._id?.toString() || "",
//             name: product.Product.name || "Unknown Product",
//             images: product.Product.images || [],
//             price: product.Product.price || 0,
//             productType: product.Product.productType || "Product",
//             category: product.Product.category || [],
//             subCategory: product.Product.subCategory || [],
//           },
//           quantity: product.quantity,
//           price: product.price,
//           selectedSize: product.selectedSize || null,
//         })),
//         totalAmount: subOrder.totalAmount,
//         deliveryStatus: subOrder.deliveryStatus,
//         shippingMethod: subOrder.shippingMethod || null,
//         trackingNumber: subOrder.trackingNumber || null,
//         deliveryDate: subOrder.deliveryDate?.toISOString() || null,
//         escrow: {
//           held: subOrder.escrow?.held || false,
//           released: subOrder.escrow?.released || false,
//           releasedAt: subOrder.escrow?.releasedAt?.toISOString() || null,
//           refunded: subOrder.escrow?.refunded || false,
//           refundReason: subOrder.escrow?.refundReason || null,
//         },
//         returnWindow: subOrder.returnWindow?.toISOString() || null,
//       })),
//     };

//     // Log successful order retrieval for monitoring
//     console.log(
//       `Store ${storeSession.storeId} successfully retrieved order ${orderId}`
//     );

//     return NextResponse.json({
//       success: true,
//       order: formattedOrder,
//     });
//   } catch (error) {
//     // ==================== Error Handling ====================

//     /**
//      * Comprehensive Error Handling
//      *
//      * Logs errors for debugging while providing user-friendly error messages.
//      * Includes specific handling for common error types.
//      */
//     console.error("Store order detail fetch error:", error);

//     // Handle specific error types
//     if (error instanceof mongoose.Error.ValidationError) {
//       return NextResponse.json(
//         {
//           error: "Invalid request data",
//           message: "The request contains invalid data",
//         },
//         { status: 400 }
//       );
//     }

//     if (error instanceof mongoose.Error.CastError) {
//       return NextResponse.json(
//         {
//           error: "Invalid order ID format",
//           message: "Please provide a valid order ID",
//         },
//         { status: 400 }
//       );
//     }

//     // Generic error response
//     return NextResponse.json(
//       {
//         error: "Internal server error",
//         message: "Failed to fetch order details. Please try again later.",
//       },
//       { status: 500 }
//     );
//   }
// }

/**
 * Update Order Information Handler (PATCH)
 *
 * Handles general order updates including notes, customer information,
 * and other order-level modifications that don't require specific endpoints.
 *
 * Features:
 * - Order notes updates
 * - Customer information corrections
 * - Administrative order modifications
 * - Comprehensive validation and error handling
 *
 * @param request - Next.js request object with update data
 * @param params - Route parameters containing orderId
 * @returns JSON response with update confirmation
 */
export async function PATCH(
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

    // ==================== Update Data Processing ====================

    /**
     * Extract Update Data from Request
     *
     * Retrieves update data from the request body and validates it.
     * Ensures that only allowed fields can be updated.
     */
    const updateData = await request.json();

    if (!updateData || typeof updateData !== "object") {
      return NextResponse.json(
        { error: "Invalid update data" },
        { status: 400 }
      );
    }

    // ==================== Database Update ====================

    /**
     * Update Order in Database
     *
     * Applies the validated updates to the order document with
     * proper error handling and validation.
     */
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

    // Apply allowed updates
    const allowedUpdates = ["notes"];
    const updates: any = {};

    for (const field of allowedUpdates) {
      if (updateData[field] !== undefined) {
        updates[field] = updateData[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 }
      );
    }

    // Update the order
    Object.assign(order, updates);
    await order.save();

    console.log(
      `Store ${
        storeSession.id
      } updated order ${orderId} with fields: ${Object.keys(updates).join(
        ", "
      )}`
    );

    return NextResponse.json({
      success: true,
      message: "Order updated successfully",
      updatedFields: Object.keys(updates),
    });
  } catch (error) {
    console.error("Store order update error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to update order. Please try again later.",
      },
      { status: 500 }
    );
  }
}
