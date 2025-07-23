import { type NextRequest, NextResponse } from "next/server";
import { getOrderModel } from "@/lib/db/models/order.model";
import { getUserModel } from "@/lib/db/models/user.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { getAdminFromRequest } from "@/lib/admin/permissions";
import {
  logAdminAction,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
} from "@/lib/admin/audit-logger";
import mongoose from "mongoose";
import { Role } from "@/modules/shared/roles";

/**
 * Admin Refund Queue API Route Handler
 *
 * Provides functionality for platform administrators to view and manage
 * sub-orders that require manual refund approval. This includes orders
 * that have been marked as Canceled, Returned, or Failed Delivery but
 * where escrow has not been processed yet.
 *
 * Business Logic:
 * - deliveryStatus IN ["Canceled", "Returned", "Failed Delivery"]
 * - escrow.held === true
 * - escrow.released === false
 * - escrow.refunded === false
 *
 * Features:
 * - Status filtering (Canceled, Returned, Failed Delivery)
 * - Date range filtering
 * - Store filtering
 * - Customer search
 * - Pagination with customizable page size
 * - Comprehensive data population
 * - Audit logging for admin actions
 *
 * Security:
 * - Admin authentication and authorization
 * - Input validation and sanitization
 * - Error handling and logging
 *
 * @param request - Next.js request object
 * @returns JSON response with filtered refund queue items and metadata
 */
export async function GET(request: NextRequest) {
  try {
    // ==================== Authentication & Authorization ====================

    /**
     * Admin Authentication Check
     *
     * Verifies that the request is coming from an authenticated admin user
     * with appropriate permissions to view refund queue data.
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

    // ==================== Request Parameters ====================

    /**
     * Extract and Process Query Parameters
     *
     * Retrieves and validates all filter parameters from the request URL
     * to build the appropriate database query.
     */
    const url = new URL(request.url);
    const params = url.searchParams;

    // Pagination parameters
    const page = Number.parseInt(params.get("page") || "1");
    const limit = Number.parseInt(params.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Date range parameters
    const fromDate = params.get("fromDate")
      ? new Date(params.get("fromDate")!)
      : null;
    const toDate = params.get("toDate")
      ? new Date(params.get("toDate")!)
      : null;

    // If toDate is provided, set it to the end of the day (23:59:59.999)
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    // Status filter - only allow valid refund statuses
    const statusFilter = params.get("status");
    const validStatuses = ["Canceled", "Returned", "Failed Delivery"];
    const deliveryStatus =
      statusFilter && validStatuses.includes(statusFilter)
        ? statusFilter
        : null;

    // Store filter
    const storeId = params.get("storeId");

    // Search parameters
    const search = params.get("search");

    // ==================== Query Construction ====================

    /**
     * Build MongoDB Aggregation Pipeline
     *
     * Uses aggregation to filter sub-orders that meet the refund queue criteria
     * and populate related data for display.
     */
    const Order = await getOrderModel();

    // Base match conditions for refund queue
    const baseMatchConditions: any = {
      "subOrders.deliveryStatus": {
        $in: ["Canceled", "Returned", "Failed Delivery"],
      },
      "subOrders.escrow.held": true,
      "subOrders.escrow.released": false,
      "subOrders.escrow.refunded": false,
    };

    // Apply date range filter if provided
    if (fromDate || toDate) {
      baseMatchConditions.createdAt = {};
      if (fromDate) baseMatchConditions.createdAt.$gte = fromDate;
      if (toDate) baseMatchConditions.createdAt.$lte = toDate;
    }

    // Apply store filter if provided
    if (storeId && mongoose.Types.ObjectId.isValid(storeId)) {
      baseMatchConditions.stores = new mongoose.Types.ObjectId(storeId);
    }

    // ==================== Search Logic ====================

    /**
     * Handle Search Functionality
     *
     * If a search term is provided, we need to find matching users first,
     * then include their IDs in our order query.
     */
    if (search && search.trim()) {
      const searchTerm = search.trim();

      // Search for matching users (by name or email)
      const User = await getUserModel();
      const Store = await getStoreModel();

      const matchingUsers = await User.find({
        $or: [
          { firstName: { $regex: searchTerm, $options: "i" } },
          { lastName: { $regex: searchTerm, $options: "i" } },
          { email: { $regex: searchTerm, $options: "i" } },
        ],
      }).select("_id");

      // Search for matching stores (by name or email)
      const matchingStores = await Store.find({
        $or: [
          { name: { $regex: searchTerm, $options: "i" } },
          { storeEmail: { $regex: searchTerm, $options: "i" } },
        ],
      }).select("_id");

      // Add user and store matches to our query
      const userIds = matchingUsers.map((user) => user._id);
      const storeIds = matchingStores.map((store) => store._id);

      if (userIds.length > 0 || storeIds.length > 0) {
        baseMatchConditions.$or = [];

        if (userIds.length > 0) {
          baseMatchConditions.$or.push({ user: { $in: userIds } });
        }

        if (storeIds.length > 0) {
          baseMatchConditions.$or.push({ stores: { $in: storeIds } });
        }
      }
    }

    // ==================== Aggregation Pipeline ====================

    /**
     * MongoDB Aggregation Pipeline
     *
     * Complex pipeline to unwind sub-orders, filter by refund criteria,
     * and populate related data for the refund queue display.
     */
    const pipeline = [
      // Match orders that have qualifying sub-orders
      { $match: baseMatchConditions },

      // Populate user data
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userData",
        },
      },

      // Unwind sub-orders to work with individual sub-orders
      { $unwind: "$subOrders" },

      // Filter sub-orders that meet refund queue criteria
      {
        $match: {
          "subOrders.deliveryStatus": {
            $in: ["Canceled", "Returned", "Failed Delivery"],
          },
          "subOrders.escrow.held": true,
          "subOrders.escrow.released": false,
          "subOrders.escrow.refunded": false,
          ...(deliveryStatus && { "subOrders.deliveryStatus": deliveryStatus }),
        },
      },

      // Populate store data for the sub-order
      {
        $lookup: {
          from: "stores",
          localField: "subOrders.store",
          foreignField: "_id",
          as: "subOrders.storeData",
        },
      },

      // Populate product data for the sub-order
      {
        $lookup: {
          from: "products",
          localField: "subOrders.products.Product",
          foreignField: "_id",
          as: "subOrders.productData",
        },
      },

      // Project the fields we need for the refund queue
      {
        $project: {
          _id: 1,
          orderNumber: {
            $concat: ["ORD-", { $substr: [{ $toString: "$_id" }, 0, 8] }],
          },
          createdAt: 1,
          updatedAt: 1,
          totalAmount: 1,
          shippingAddress: 1,
          paymentMethod: 1,
          paymentStatus: 1,
          customer: {
            id: { $arrayElemAt: ["$userData._id", 0] },
            name: {
              $concat: [
                { $arrayElemAt: ["$userData.firstName", 0] },
                " ",
                { $arrayElemAt: ["$userData.lastName", 0] },
              ],
            },
            email: { $arrayElemAt: ["$userData.email", 0] },
          },
          subOrder: {
            id: "$subOrders._id",
            store: {
              id: { $arrayElemAt: ["$subOrders.storeData._id", 0] },
              name: { $arrayElemAt: ["$subOrders.storeData.name", 0] },
              email: { $arrayElemAt: ["$subOrders.storeData.storeEmail", 0] },
            },
            products: "$subOrders.products",
            totalAmount: "$subOrders.totalAmount",
            deliveryStatus: "$subOrders.deliveryStatus",
            escrow: "$subOrders.escrow",
            shippingMethod: "$subOrders.shippingMethod",
            deliveryDate: "$subOrders.deliveryDate",
            customerConfirmedDelivery: "$subOrders.customerConfirmedDelivery",
            returnWindow: "$subOrders.returnWindow",
          },
        },
      },

      // Sort by creation date (most recent first)
      { $sort: { createdAt: -1 } },
    ];

    // ==================== Execute Aggregation ====================

    /**
     * Execute Database Query
     *
     * Runs the aggregation pipeline and handles pagination.
     */
    const [refundQueueItems, totalCountResult] = await Promise.all([
      Order.aggregate([...pipeline, { $skip: skip }, { $limit: limit }]),
      Order.aggregate([...pipeline, { $count: "total" }]),
    ]);

    const totalItems =
      totalCountResult.length > 0 ? totalCountResult[0].total : 0;

    // ==================== Response Formatting ====================

    /**
     * Format Refund Queue Items for Response
     *
     * Transforms the aggregation results into a properly formatted
     * response with consistent types and structure.
     */
    const formattedItems = refundQueueItems.map((item) => {
      // Calculate the date when the order was marked for refund
      const refundRequestDate = item.updatedAt || item.createdAt;

      // Format product information
      const products = item.subOrder.products.map((product: any) => ({
        id: product.Product?.toString() || "",
        quantity: product.quantity,
        price: product.price,
        selectedSize: product.selectedSize,
      }));

      return {
        id: item._id.toString(),
        orderNumber: item.orderNumber,
        subOrderId: item.subOrder.id.toString(),
        customer: {
          id: item.customer.id?.toString() || "",
          name: item.customer.name || "Unknown Customer",
          email: item.customer.email || "",
        },
        store: {
          id: item.subOrder.store.id?.toString() || "",
          name: item.subOrder.store.name || "Unknown Store",
          email: item.subOrder.store.email || "",
        },
        products,
        totalAmount: item.subOrder.totalAmount,
        deliveryStatus: item.subOrder.deliveryStatus,
        escrow: item.subOrder.escrow,
        shippingMethod: item.subOrder.shippingMethod,
        refundRequestDate: refundRequestDate.toISOString(),
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
        // Additional order context
        orderTotalAmount: item.totalAmount,
        shippingAddress: item.shippingAddress,
        paymentMethod: item.paymentMethod,
        paymentStatus: item.paymentStatus,
      };
    });

    // ==================== Audit Logging ====================

    /**
     * Log Admin Action
     *
     * Records the admin's refund queue viewing action for audit purposes,
     * including the filters they applied.
     */
    await logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      adminRoles: admin.roles as Role[],
      action: AUDIT_ACTIONS.REFUND_QUEUE_VIEWED,
      module: AUDIT_MODULES.REFUNDS,
      details: {
        filters: {
          page,
          limit,
          fromDate: fromDate?.toISOString(),
          toDate: toDate?.toISOString(),
          deliveryStatus,
          storeId,
          search,
        },
        resultCount: formattedItems.length,
      },
    });

    // ==================== Response ====================

    /**
     * Return Formatted Response
     *
     * Sends back the formatted refund queue items along with pagination metadata
     * and any applied filters for client-side state management.
     */
    return NextResponse.json({
      success: true,
      refundQueue: formattedItems,
      pagination: {
        page,
        limit,
        total: totalItems,
        pages: Math.ceil(totalItems / limit),
      },
      filters: {
        fromDate: fromDate?.toISOString() || null,
        toDate: toDate?.toISOString() || null,
        deliveryStatus: deliveryStatus || "all",
        search: search || "",
      },
      summary: {
        totalPendingRefunds: totalItems,
        totalRefundAmount: formattedItems.reduce(
          (sum, item) => sum + item.totalAmount,
          0
        ),
      },
    });
  } catch (error) {
    // ==================== Error Handling ====================

    /**
     * Comprehensive Error Handling
     *
     * Logs errors for debugging while providing user-friendly error messages.
     * Includes specific handling for common error types.
     */
    console.error("Admin refund queue fetch error:", error);

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
        message: "Failed to fetch refund queue. Please try again later.",
      },
      { status: 500 }
    );
  }
}
