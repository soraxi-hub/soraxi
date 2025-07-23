import { type NextRequest, NextResponse } from "next/server";
import { getOrderModel } from "@/lib/db/models/order.model";
import { getAdminFromRequest } from "@/lib/admin/permissions";
import {
  logAdminAction,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
} from "@/lib/admin/audit-logger";
import mongoose from "mongoose";
import { Role } from "@/modules/shared/roles";

/**
 * Admin Escrow Release Detail API Route Handler
 *
 * Provides detailed information about a specific sub-order that is eligible
 * for escrow release, including complete order context and customer/store details.
 *
 * Features:
 * - Complete sub-order details with full context
 * - Customer and store information
 * - Product details with images and specifications
 * - Escrow status and financial information
 * - Delivery confirmation details
 * - Return window information
 *
 * Security:
 * - Admin authentication and authorization
 * - Input validation and sanitization
 * - Comprehensive error logging for monitoring
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing subOrderId
 * @returns JSON response with complete sub-order details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subOrderId: string }> }
) {
  try {
    // ==================== Authentication & Authorization ====================

    /**
     * Admin Authentication Check
     *
     * Verifies that the request is coming from an authenticated admin user
     * with appropriate permissions to view detailed escrow data.
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
     * Sub-Order ID Validation
     *
     * Validates the sub-order ID parameter to ensure it's a valid MongoDB ObjectId
     * before attempting database queries.
     */
    const { subOrderId } = await params;

    if (!subOrderId || typeof subOrderId !== "string") {
      return NextResponse.json(
        {
          error: "Invalid request",
          message: "Sub-order ID is required",
        },
        { status: 400 }
      );
    }

    if (!mongoose.Types.ObjectId.isValid(subOrderId)) {
      return NextResponse.json(
        {
          error: "Invalid sub-order ID",
          message: "Please provide a valid sub-order ID",
        },
        { status: 400 }
      );
    }

    // ==================== Database Query ====================

    /**
     * Fetch Sub-Order with Complete Context
     *
     * Uses MongoDB aggregation to find the specific sub-order and populate
     * all related data including order context, customer, store, and products.
     */
    const Order = await getOrderModel();

    const pipeline = [
      // Unwind sub-orders to work with individual sub-orders
      { $unwind: "$subOrders" },

      // Match the specific sub-order
      {
        $match: {
          "subOrders._id": new mongoose.Types.ObjectId(subOrderId),
        },
      },

      // Verify escrow release eligibility
      {
        $match: {
          "subOrders.escrow.held": true,
          "subOrders.escrow.released": false,
          "subOrders.deliveryStatus": "Delivered",
          "subOrders.returnWindow": { $lt: new Date() },
        },
      },

      // Populate user data
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userDetails",
          pipeline: [
            {
              $project: {
                _id: 1,
                firstName: 1,
                lastName: 1,
                email: 1,
                phoneNumber: 1,
              },
            },
          ],
        },
      },

      // Populate store data
      {
        $lookup: {
          from: "stores",
          localField: "subOrders.store",
          foreignField: "_id",
          as: "storeDetails",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                storeEmail: 1,
                logoUrl: 1,
                verification: 1,
                businessInfo: 1,
              },
            },
          ],
        },
      },

      // Populate product data
      {
        $lookup: {
          from: "products",
          localField: "subOrders.products.Product",
          foreignField: "_id",
          as: "productDetails",
          pipeline: [
            {
              $project: {
                _id: 1,
                name: 1,
                images: 1,
                price: 1,
                category: 1,
                subCategory: 1,
                productType: 1,
              },
            },
          ],
        },
      },

      // Add computed fields
      {
        $addFields: {
          userDetails: { $arrayElemAt: ["$userDetails", 0] },
          storeDetails: { $arrayElemAt: ["$storeDetails", 0] },
          daysSinceReturnWindow: {
            $divide: [
              { $subtract: [new Date(), "$subOrders.returnWindow"] },
              1000 * 60 * 60 * 24,
            ],
          },
        },
      },
    ];

    const results = await Order.aggregate(pipeline);

    if (!results || results.length === 0) {
      return NextResponse.json(
        {
          error: "Sub-order not found",
          message:
            "The requested sub-order could not be found or is not eligible for escrow release",
        },
        { status: 404 }
      );
    }

    const result = results[0];

    // ==================== Data Formatting ====================

    /**
     * Format Sub-Order Data for Client
     *
     * Transforms the aggregation result into a properly formatted
     * object suitable for client consumption with type safety.
     */

    // Generate readable IDs
    const orderNumber = `ORD-${result._id
      .toString()
      .substring(0, 8)
      .toUpperCase()}`;
    const subOrderNumber = `SUB-${result.subOrders._id
      .toString()
      .substring(0, 8)
      .toUpperCase()}`;

    // Format customer information
    const customer = {
      id: result.userDetails?._id?.toString() || "",
      name: result.userDetails
        ? `${result.userDetails.firstName} ${result.userDetails.lastName}`
        : "Unknown Customer",
      email: result.userDetails?.email || "",
      phone: result.userDetails?.phoneNumber || null,
    };

    // Format store information
    const store = {
      id: result.storeDetails?._id?.toString() || "",
      name: result.storeDetails?.name || "Unknown Store",
      email: result.storeDetails?.storeEmail || "",
      logo: result.storeDetails?.logoUrl || null,
      verification: {
        isVerified: result.storeDetails?.verification?.isVerified || false,
        method: result.storeDetails?.verification?.method || null,
        verifiedAt: result.storeDetails?.verification?.verifiedAt || null,
      },
      businessInfo: {
        type: result.storeDetails?.businessInfo?.type || "individual",
        businessName: result.storeDetails?.businessInfo?.businessName || null,
        registrationNumber:
          result.storeDetails?.businessInfo?.registrationNumber || null,
      },
    };

    // Format product information with details
    const products = result.subOrders.products.map((product: any) => {
      const productDetail = result.productDetails.find(
        (p: any) => p._id.toString() === product.Product.toString()
      );
      return {
        id: product.Product.toString(),
        name: productDetail?.name || "Unknown Product",
        images: productDetail?.images || [],
        quantity: product.quantity,
        price: product.price,
        selectedSize: product.selectedSize || null,
        category: productDetail?.category || [],
        subCategory: productDetail?.subCategory || [],
        productType: productDetail?.productType || "Product",
        totalPrice: product.quantity * product.price,
      };
    });

    // Format escrow information
    const escrowInfo = {
      held: result.subOrders.escrow.held,
      released: result.subOrders.escrow.released,
      releasedAt: result.subOrders.escrow.releasedAt || null,
      refunded: result.subOrders.escrow.refunded,
      refundReason: result.subOrders.escrow.refundReason || null,
      amount: result.subOrders.totalAmount,
    };

    // Format delivery information
    const deliveryInfo = {
      status: result.subOrders.deliveryStatus,
      deliveredAt: result.subOrders.deliveryDate,
      returnWindow: result.subOrders.returnWindow,
      daysSinceReturnWindow: Math.floor(result.daysSinceReturnWindow),
      customerConfirmation: {
        confirmed:
          result.subOrders.customerConfirmedDelivery?.confirmed || false,
        confirmedAt:
          result.subOrders.customerConfirmedDelivery?.confirmedAt || null,
        autoConfirmed:
          result.subOrders.customerConfirmedDelivery?.autoConfirmed || false,
      },
      shippingMethod: result.subOrders.shippingMethod || null,
    };

    // Format order context
    const orderContext = {
      id: result._id.toString(),
      orderNumber,
      totalAmount: result.totalAmount,
      shippingAddress: result.shippingAddress,
      paymentMethod: result.paymentMethod || null,
      paymentStatus: result.paymentStatus || null,
      notes: result.notes || null,
      createdAt: result.createdAt.toISOString(),
      updatedAt: result.updatedAt.toISOString(),
    };

    const formattedSubOrder = {
      id: result.subOrders._id.toString(),
      subOrderNumber,
      customer,
      store,
      products,
      escrowInfo,
      deliveryInfo,
      orderContext,
      eligibilityCheck: {
        isEligible: true,
        reasons: [
          "Delivery status is 'Delivered'",
          "Return window has passed",
          "Escrow is currently held",
          "Funds have not been released yet",
        ],
      },
    };

    // ==================== Audit Logging ====================

    /**
     * Log Admin Action
     *
     * Records the admin's detailed sub-order viewing action for audit purposes.
     */
    await logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      adminRoles: admin.roles as Role[],
      action: AUDIT_ACTIONS.ORDER_VIEWED,
      module: AUDIT_MODULES.FINANCE,
      details: {
        viewType: "escrow_release_detail",
        subOrderId,
        subOrderNumber,
        orderNumber,
        escrowAmount: escrowInfo.amount,
        daysSinceReturnWindow: deliveryInfo.daysSinceReturnWindow,
      },
    });

    // ==================== Response ====================

    /**
     * Return Formatted Response
     *
     * Sends back the formatted sub-order details.
     */
    return NextResponse.json({
      success: true,
      subOrder: formattedSubOrder,
    });
  } catch (error) {
    // ==================== Error Handling ====================

    /**
     * Comprehensive Error Handling
     *
     * Logs errors for debugging while providing user-friendly error messages.
     */
    console.error("Admin escrow release detail fetch error:", error);

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
          error: "Invalid sub-order ID format",
          message: "Please provide a valid sub-order ID",
        },
        { status: 400 }
      );
    }

    // Generic error response
    return NextResponse.json(
      {
        error: "Internal server error",
        message: "Failed to fetch sub-order details. Please try again later.",
      },
      { status: 500 }
    );
  }
}
