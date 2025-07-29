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
 * Admin Orders API Route Handler
 *
 * Provides comprehensive order management functionality for platform administrators,
 * including advanced filtering, search, and pagination capabilities.
 *
 * Features:
 * - Date range filtering (from/to)
 * - Status filtering (order status)
 * - Store filtering
 * - Customer search
 * - Order number search
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
 * @returns JSON response with filtered orders and metadata
 */
export async function GET(request: NextRequest) {
  try {
    // ==================== Authentication & Authorization ====================

    /**
     * Admin Authentication Check
     *
     * Verifies that the request is coming from an authenticated admin user
     * with appropriate permissions to view order data.
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

    // Status filters
    const status = params.get("status");

    // Store filter
    const storeId = params.get("storeId");

    // Search parameters
    const search = params.get("search");

    // ==================== Query Construction ====================

    /**
     * Build MongoDB Query
     *
     * Constructs a MongoDB query object based on the provided filters
     * to retrieve the appropriate subset of orders.
     */
    const query: any = {};

    // Apply date range filter if provided
    if (fromDate || toDate) {
      query.createdAt = {};
      if (fromDate) query.createdAt.$gte = fromDate;
      if (toDate) query.createdAt.$lte = toDate;
    }

    // Apply store filter if provided
    if (storeId && mongoose.Types.ObjectId.isValid(storeId)) {
      query.stores = new mongoose.Types.ObjectId(storeId);
    }

    // Apply status filter if provided
    if (status && status !== "all") {
      // For order status filtering, we need to filter on subOrders.deliveryStatus
      query["subOrders.deliveryStatus"] = status;
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

      // We need to search across multiple fields and collections
      const User = await getUserModel();
      const Store = await getStoreModel();

      // Search for matching users (by name or email)
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
        query.$or = [];

        if (userIds.length > 0) {
          query.$or.push({ user: { $in: userIds } });
        }

        if (storeIds.length > 0) {
          query.$or.push({ stores: { $in: storeIds } });
        }
      }
    }

    // ==================== Database Query Execution ====================

    /**
     * Execute Database Query
     *
     * Retrieves orders from the database based on the constructed query,
     * with proper population of related data and pagination.
     */
    const Order = await getOrderModel();

    // Count total matching documents for pagination
    const totalOrders = await Order.countDocuments(query);

    // Execute main query with population
    const orders = await Order.find(query)
      .sort({ createdAt: -1 }) // Most recent first
      .skip(skip)
      .limit(limit)
      .populate({
        path: "user",
        model: "User",
        select: "firstName lastName email phoneNumber",
      })
      .populate({
        path: "stores",
        model: "Store",
        select: "name storeEmail",
      })
      .populate({
        path: "subOrders.store",
        model: "Store",
        select: "name storeEmail",
      })
      .populate({
        path: "subOrders.products.Product",
        model: "Product",
        select: "name images price",
      })
      .lean();

    // ==================== Response Formatting ====================

    /**
     * Format Orders for Response
     *
     * Transforms the raw MongoDB documents into a properly formatted
     * response with consistent types and structure.
     */
    const formattedOrders = orders.map((order) => {
      // Generate a readable order number from the MongoDB ID
      const orderNumber = `ORD-${order._id
        .toString()
        .substring(0, 8)
        .toUpperCase()}`;

      // Format user information
      const customer = {
        id: order.user?._id?.toString() || "",
        name: order.user
          ? `${order.user.firstName} ${order.user.lastName}`
          : "Unknown Customer",
        email: order.user?.email || "",
      };

      // Format store information (using the first store for simplicity in the list view)
      const primaryStore =
        order.stores && order.stores.length > 0 ? order.stores[0] : null;
      const store = {
        id: primaryStore?._id?.toString() || "",
        name: primaryStore?.name || "Unknown Store",
        email: primaryStore?.storeEmail || "",
      };

      // Extract all items across all sub-orders
      const items = order.subOrders.flatMap((subOrder) =>
        subOrder.products.map((product) => ({
          id: product.Product?._id?.toString() || "",
          name: product.Product?.name || "Unknown Product",
          price: product.price,
          quantity: product.quantity,
          image: product.Product?.images?.[0] || null,
        }))
      );

      // Determine overall order status (using the "worst" status across sub-orders)
      // const statusPriority = {
      //   Canceled: 1,
      //   Refunded: 2,
      //   "Failed Delivery": 3,
      //   Returned: 4,
      //   "Order Placed": 5,
      //   Processing: 6,
      //   Shipped: 7,
      //   "Out for Delivery": 8,
      //   Delivered: 9,
      // };

      // let overallStatus = "Order Placed";
      // if (order.subOrders && order.subOrders.length > 0) {
      //   // Find the status with the lowest priority (worst status)
      //   overallStatus = order.subOrders.reduce((worst, subOrder) => {
      //     const currentPriority =
      //       statusPriority[
      //         subOrder.deliveryStatus as keyof typeof statusPriority
      //       ] || 5;
      //     const worstPriority =
      //       statusPriority[worst as keyof typeof statusPriority] || 5;
      //     return currentPriority < worstPriority
      //       ? subOrder.deliveryStatus
      //       : worst;
      //   }, "Order Placed");
      // }

      // Determine payment status
      const paymentStatus = order.paymentStatus || "pending";

      return {
        id: order._id.toString(),
        orderNumber,
        customer,
        store,
        items,
        // status: overallStatus,
        paymentStatus,
        totalAmount: order.totalAmount,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        notes: order.notes || null,
      };
    });

    // ==================== Audit Logging ====================

    /**
     * Log Admin Action
     *
     * Records the admin's order viewing action for audit purposes,
     * including the filters they applied.
     */
    await logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      adminRoles: admin.roles as Role[],
      action: AUDIT_ACTIONS.ORDER_VIEWED,
      module: AUDIT_MODULES.ORDERS,
      details: {
        filters: {
          page,
          limit,
          fromDate: fromDate?.toISOString(),
          toDate: toDate?.toISOString(),
          status,
          storeId,
          search,
        },
        resultCount: formattedOrders.length,
      },
    });

    // ==================== Response ====================

    /**
     * Return Formatted Response
     *
     * Sends back the formatted orders along with pagination metadata
     * and any applied filters for client-side state management.
     */
    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      pagination: {
        page,
        limit,
        total: totalOrders,
        pages: Math.ceil(totalOrders / limit),
      },
      filters: {
        fromDate: fromDate?.toISOString() || null,
        toDate: toDate?.toISOString() || null,
        status: status || "all",
        search: search || "",
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
    console.error("Admin orders fetch error:", error);

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
        message: "Failed to fetch orders. Please try again later.",
      },
      { status: 500 }
    );
  }
}
