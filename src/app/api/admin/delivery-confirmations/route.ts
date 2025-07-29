import { type NextRequest, NextResponse } from "next/server";
import { getOrderModel } from "@/lib/db/models/order.model";
import { getUserModel } from "@/lib/db/models/user.model";
import { getAdminFromRequest } from "@/lib/admin/permissions";
import {
  logAdminAction,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
} from "@/lib/admin/audit-logger";
import mongoose from "mongoose";
import { Role } from "@/modules/shared/roles";

/**
 * Delivery Confirmation Queue API Route Handler
 *
 * Provides functionality for platform administrators to view and manage
 * sub-orders that require manual delivery confirmation. This includes orders
 * that have been marked as Delivered but not confirmed by customers for more than 2 days.
 *
 * Business Logic:
 * - deliveryStatus = "Delivered"
 * - customerConfirmedDelivery.confirmed = false
 * - deliveryDate is older than 2 days
 *
 * Features:
 * - Date range filtering
 * - Store filtering
 * - Customer search
 * - Pagination with customizable page size
 * - Comprehensive data population
 * - Audit logging for admin actions
 * - Manual confirmation endpoint
 *
 * Security:
 * - Admin authentication and authorization
 * - Input validation and sanitization
 * - Error handling and logging
 */

// Calculate date 2 days ago for default filter
const twoDaysAgo = new Date();
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
twoDaysAgo.setHours(0, 0, 0, 0); // Start of day

/**
 * GET Handler - Retrieve Delivery Confirmation Queue
 *
 * Fetches a paginated list of sub-orders that require manual delivery confirmation
 * based on the specified filters.
 *
 * @param request - Next.js request object
 * @returns JSON response with filtered confirmation queue items and metadata
 */
export async function GET(request: NextRequest) {
  try {
    // ==================== Authentication & Authorization ====================

    /**
     * Admin Authentication Check
     *
     * Verifies that the request is coming from an authenticated admin user
     * with appropriate permissions to view the delivery confirmation queue.
     */
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const page = parseInt(params.get("page") || "1");
    const limit = parseInt(params.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Store filter
    const storeId = params.get("storeId");

    // Search term for customer lookup
    const search = params.get("search");

    // Date range filters
    const fromDate = params.get("fromDate")
      ? new Date(params.get("fromDate")!)
      : null;
    const toDate = params.get("toDate")
      ? new Date(params.get("toDate")!)
      : null;

    // Adjust toDate to end of day if provided
    if (toDate) toDate.setHours(23, 59, 59, 999);

    // ==================== Query Construction ====================

    /**
     * Base Match Conditions
     *
     * Defines the core criteria for sub-orders that should appear in the
     * delivery confirmation queue:
     * - Delivery status is "Delivered"
     * - Customer hasn't confirmed delivery
     * - Delivery date is older than 2 days
     */
    const Order = await getOrderModel();
    const baseMatch: any = {
      "subOrders.deliveryStatus": "Delivered",
      "subOrders.customerConfirmedDelivery.confirmed": false,
      "subOrders.deliveryDate": { $lte: twoDaysAgo },
    };

    // Apply date range filter if provided
    if (fromDate || toDate) {
      baseMatch["subOrders.deliveryDate"] = {
        ...baseMatch["subOrders.deliveryDate"],
        ...(fromDate && { $gte: fromDate }),
        ...(toDate && { $lte: toDate }),
      };
    }

    // Apply store filter if provided and valid
    if (storeId && mongoose.Types.ObjectId.isValid(storeId)) {
      baseMatch["subOrders.store"] = new mongoose.Types.ObjectId(storeId);
    }

    // ==================== Search Logic ====================

    /**
     * Handle Search Functionality
     *
     * If a search term is provided, we need to find matching users first,
     * then include their IDs in our order query.
     */
    let userIds: mongoose.Schema.Types.ObjectId[] = [];
    if (search) {
      const User = await getUserModel();
      const matchingUsers = await User.find({
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } },
          { email: { $regex: search, $options: "i" } },
        ],
      }).select("_id");
      userIds = matchingUsers.map((u) => u._id);
    }

    // ==================== Aggregation Pipeline ====================

    /**
     * MongoDB Aggregation Pipeline
     *
     * Complex pipeline to:
     * 1. Match orders with qualifying sub-orders
     * 2. Unwind sub-orders for individual processing
     * 3. Apply additional filters
     * 4. Populate customer and store data
     * 5. Format results for display
     */
    const pipeline: mongoose.PipelineStage[] = [
      // Initial match for orders with qualifying sub-orders
      { $match: baseMatch },

      // Unwind sub-orders to process individually
      { $unwind: { path: "$subOrders" } },

      // Apply sub-order specific filters
      {
        $match: {
          "subOrders.deliveryStatus": "Delivered",
          "subOrders.customerConfirmedDelivery.confirmed": false,
          "subOrders.deliveryDate": { $lte: twoDaysAgo },
          ...(userIds.length > 0 ? { user: { $in: userIds } } : {}),
        },
      },

      // Populate customer data
      {
        $lookup: {
          from: "users",
          localField: "user",
          foreignField: "_id",
          as: "userData",
        },
      },

      // Populate store data
      {
        $lookup: {
          from: "stores",
          localField: "subOrders.store",
          foreignField: "_id",
          as: "storeData",
        },
      },

      // Project and format the required fields
      {
        $project: {
          _id: 1,
          orderNumber: {
            $concat: ["ORD-", { $substr: [{ $toString: "$_id" }, 0, 8] }],
          },
          createdAt: 1,
          updatedAt: 1,
          customer: {
            $arrayElemAt: ["$userData", 0],
          },
          store: {
            $arrayElemAt: ["$storeData", 0],
          },
          subOrder: "$subOrders",
        },
      },

      // Sort by delivery date (oldest first)
      { $sort: { "subOrder.deliveryDate": 1 } },

      // Apply pagination
      { $skip: skip },
      { $limit: limit },
    ];

    // Count pipeline for pagination totals
    const countPipeline = [...pipeline.slice(0, -2), { $count: "total" }];

    // Execute both queries in parallel
    const [results, countResult] = await Promise.all([
      Order.aggregate(pipeline),
      Order.aggregate(countPipeline),
    ]);

    const total = countResult[0]?.total || 0;

    // ==================== Response Formatting ====================

    /**
     * Format Results for Response
     *
     * Transforms the aggregation results into a consistent response format
     * with proper type conversion and structure.
     */
    const formatted = results.map((item) => ({
      id: item._id.toString(),
      orderNumber: item.orderNumber,
      subOrderId: item.subOrder._id.toString(),
      customer: {
        id: item.customer._id.toString(),
        name: `${item.customer.firstName} ${item.customer.lastName}`,
        email: item.customer.email,
      },
      store: {
        id: item.store._id.toString(),
        name: item.store.name,
        email: item.store.storeEmail,
      },
      deliveryDate: item.subOrder.deliveryDate.toISOString(),
      deliveryStatus: item.subOrder.deliveryStatus,
      escrow: item.subOrder.escrow,
    }));

    // ==================== Audit Logging ====================

    /**
     * Log Admin Action
     *
     * Records the admin's queue viewing action for audit purposes,
     * including the filters they applied.
     */
    await logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      adminRoles: admin.roles as Role[],
      action: AUDIT_ACTIONS.DELIVERY_CONFIRMATION_QUEUE_VIEWED,
      module: AUDIT_MODULES.DELIVERIES,
      details: {
        filters: { page, limit, storeId, search, fromDate, toDate },
        resultCount: formatted.length,
      },
    });

    // ==================== Response ====================

    /**
     * Return Formatted Response
     *
     * Sends back the formatted queue items along with pagination metadata.
     */
    return NextResponse.json({
      success: true,
      deliveryConfirmations: formatted,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    // ==================== Error Handling ====================

    /**
     * Handle Errors
     *
     * Logs errors for debugging while providing a generic error response.
     */
    console.error("Delivery confirmation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * POST Handler - Manually Confirm Delivery
 *
 * Allows administrators to manually confirm delivery for a sub-order when
 * the customer hasn't confirmed within the required timeframe.
 *
 * Business Logic:
 * - Updates customerConfirmedDelivery.autoConfirmed to mark as confirmed (by the system)
//  * - Releases escrow funds to the store. we are only going to release it once they return window has elapsed.
 * - Records the manual confirmation timestamp
 *
 * @param request - Next.js request object containing subOrderId
 * @returns JSON response with updated sub-order data
 */
export async function POST(request: NextRequest) {
  try {
    // ==================== Authentication & Authorization ====================

    /**
     * Admin Authentication Check
     *
     * Verifies that the request is coming from an authenticated admin user
     * with appropriate permissions to perform manual confirmations.
     */
    const admin = getAdminFromRequest(request);
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ==================== Request Validation ====================

    /**
     * Validate Request Body
     *
     * Ensures the required subOrderId is provided and valid.
     */
    const { subOrderId } = (await request.json()) as {
      subOrderId: mongoose.Types.ObjectId;
    };
    if (!subOrderId || !mongoose.Types.ObjectId.isValid(subOrderId)) {
      return NextResponse.json(
        { error: "Invalid sub-order ID" },
        { status: 400 }
      );
    }

    // ==================== Database Update ====================

    /**
     * Find and Update Sub-Order
     *
     * Locates the qualifying sub-order and updates its status to mark
     * the delivery as confirmed and release escrow funds.
     */
    const Order = await getOrderModel();
    const now = new Date();

    const result = await Order.findOneAndUpdate(
      {
        "subOrders._id": new mongoose.Types.ObjectId(subOrderId),
        "subOrders.deliveryStatus": "Delivered",
        "subOrders.customerConfirmedDelivery.confirmed": false,
      },
      {
        $set: {
          "subOrders.$.customerConfirmedDelivery.confirmed": false,
          "subOrders.$.customerConfirmedDelivery.confirmedAt": now,
          "subOrders.$.customerConfirmedDelivery.autoConfirmed": true,
          //   "subOrders.$.escrow.held": false,
          //   "subOrders.$.escrow.released": true,
          //   "subOrders.$.escrow.releasedAt": now, we are only going to release it once they return window has elapsed.
        },
      },
      { new: true } // Return the updated document
    );

    // Handle case where sub-order not found or already confirmed
    if (!result) {
      return NextResponse.json(
        { error: "Sub-order not found or already confirmed" },
        { status: 404 }
      );
    }

    // Extract the updated sub-order from the result
    const updatedSubOrder = result.subOrders.find(
      (so: any) => so._id?.toString() === subOrderId
    );

    if (!updatedSubOrder || !updatedSubOrder._id) {
      return NextResponse.json(
        { error: "Updated sub-order not found" },
        { status: 404 }
      );
    }

    // ==================== Audit Logging ====================

    /**
     * Log Admin Action
     *
     * Records the manual confirmation for audit purposes.
     */
    await logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      adminRoles: admin.roles as Role[],
      action: AUDIT_ACTIONS.DELIVERY_MANUALLY_CONFIRMED,
      module: AUDIT_MODULES.DELIVERIES,
      details: { subOrderId },
    });

    // ==================== Response ====================

    /**
     * Return Success Response
     *
     * Provides the updated sub-order data to confirm the changes were applied.
     */
    return NextResponse.json({
      success: true,
      subOrder: {
        id: updatedSubOrder._id.toString(),
        customerConfirmedDelivery: updatedSubOrder.customerConfirmedDelivery,
        escrow: updatedSubOrder.escrow,
      },
    });
  } catch (error) {
    // ==================== Error Handling ====================

    /**
     * Handle Errors
     *
     * Logs errors for debugging while providing a generic error response.
     */
    console.error("Manual confirmation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
