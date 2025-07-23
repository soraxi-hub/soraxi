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
 * Admin Escrow Release Queue API Route Handler
 *
 * Provides comprehensive escrow release queue functionality for platform administrators,
 * showing sub-orders that are eligible for escrow release to sellers.
 *
 * Business Logic for Escrow Release Eligibility:
 * - escrow.held === true (funds are currently held in escrow)
 * - escrow.released === false (funds haven't been released yet)
 * - deliveryStatus === "Delivered" (order has been delivered)
 * - returnWindow has passed (current date > returnWindow date)
 *
 * Features:
 * - Advanced filtering by date range, store, and search
 * - Pagination with customizable page size
 * - Comprehensive data population with customer and store details
 * - Audit logging for admin actions
 * - Performance optimization with MongoDB aggregation
 *
 * Security:
 * - Admin authentication and authorization
 * - Input validation and sanitization
 * - Comprehensive error handling and logging
 *
 * @param request - Next.js request object
 * @returns JSON response with eligible sub-orders and metadata
 */
export async function GET(request: NextRequest) {
  try {
    // ==================== Authentication & Authorization ====================

    /**
     * Admin Authentication Check
     *
     * Verifies that the request is coming from an authenticated admin user
     * with appropriate permissions to view escrow release data.
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

    // If toDate is provided, set it to the end of the day
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    // Store filter
    const storeId = params.get("storeId");

    // Search parameters
    const search = params.get("search");

    // ==================== MongoDB Aggregation Pipeline ====================

    /**
     * Build MongoDB Aggregation Pipeline
     *
     * Creates a complex aggregation pipeline to:
     * 1. Unwind sub-orders to work with individual sub-orders
     * 2. Filter based on escrow release eligibility criteria
     * 3. Apply additional filters (date, store, search)
     * 4. Populate related data (user, store, products)
     * 5. Format data for client consumption
     */
    const Order = await getOrderModel();

    // Base pipeline to unwind sub-orders and filter eligible ones
    const basePipeline: any[] = [
      // Unwind sub-orders to work with individual sub-orders
      { $unwind: "$subOrders" },

      // Filter for escrow release eligibility
      {
        $match: {
          "subOrders.escrow.held": true,
          "subOrders.escrow.released": false,
          "subOrders.deliveryStatus": "Delivered",
          "subOrders.returnWindow": { $lt: new Date() }, // Return window has passed
        },
      },
    ];

    // Apply date range filter if provided
    if (fromDate || toDate) {
      const dateFilter: any = {};
      if (fromDate) dateFilter.$gte = fromDate;
      if (toDate) dateFilter.$lte = toDate;

      basePipeline.push({
        $match: {
          createdAt: dateFilter,
        },
      });
    }

    // Apply store filter if provided
    if (storeId && mongoose.Types.ObjectId.isValid(storeId)) {
      basePipeline.push({
        $match: {
          "subOrders.store": new mongoose.Types.ObjectId(storeId),
        },
      });
    }

    // Populate user data
    basePipeline.push({
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
    });

    // Populate store data
    basePipeline.push({
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
            },
          },
        ],
      },
    });

    // Populate product data
    basePipeline.push({
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
            },
          },
        ],
      },
    });

    // Add computed fields
    basePipeline.push({
      $addFields: {
        userDetails: { $arrayElemAt: ["$userDetails", 0] },
        storeDetails: { $arrayElemAt: ["$storeDetails", 0] },
        // Calculate days since return window passed
        daysSinceReturnWindow: {
          $divide: [
            { $subtract: [new Date(), "$subOrders.returnWindow"] },
            1000 * 60 * 60 * 24, // Convert milliseconds to days
          ],
        },
      },
    });

    // Apply search filter if provided
    if (search && search.trim()) {
      basePipeline.push({
        $match: {
          $or: [
            {
              "userDetails.firstName": { $regex: search.trim(), $options: "i" },
            },
            {
              "userDetails.lastName": { $regex: search.trim(), $options: "i" },
            },
            { "userDetails.email": { $regex: search.trim(), $options: "i" } },
            { "storeDetails.name": { $regex: search.trim(), $options: "i" } },
            {
              "storeDetails.storeEmail": {
                $regex: search.trim(),
                $options: "i",
              },
            },
          ],
        },
      });
    }

    // Sort by return window date (oldest first - highest priority)
    basePipeline.push({
      $sort: { "subOrders.returnWindow": 1 },
    });

    // ==================== Execute Aggregation ====================

    /**
     * Execute Database Queries
     *
     * Runs the aggregation pipeline to get both the data and total count
     * for pagination purposes.
     */

    // Count total matching documents
    const countPipeline = [...basePipeline, { $count: "total" }];
    const countResult = await Order.aggregate(countPipeline);
    const totalSubOrders = countResult[0]?.total || 0;

    // Get paginated results
    const dataPipeline = [...basePipeline, { $skip: skip }, { $limit: limit }];
    const results = await Order.aggregate(dataPipeline);

    // ==================== Response Formatting ====================

    /**
     * Format Sub-Orders for Response
     *
     * Transforms the aggregation results into a properly formatted
     * response with consistent types and structure.
     */
    const formattedSubOrders = results.map((result) => {
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
      };

      // Calculate escrow amount (sub-order total)
      const escrowAmount = result.subOrders.totalAmount;

      // Format delivery information
      const deliveryInfo = {
        status: result.subOrders.deliveryStatus,
        deliveredAt: result.subOrders.deliveryDate,
        returnWindow: result.subOrders.returnWindow,
        daysSinceReturnWindow: Math.floor(result.daysSinceReturnWindow),
        customerConfirmed:
          result.subOrders.customerConfirmedDelivery?.confirmed || false,
        autoConfirmed:
          result.subOrders.customerConfirmedDelivery?.autoConfirmed || false,
      };

      // Format product information
      const products = result.subOrders.products.map(
        (product: any, index: number) => {
          const productDetail = result.productDetails.find(
            (p: any) => p._id.toString() === product.Product.toString()
          );
          return {
            id: product.Product.toString(),
            name: productDetail?.name || "Unknown Product",
            quantity: product.quantity,
            price: product.price,
            image: productDetail?.images?.[0] || null,
          };
        }
      );

      return {
        id: result.subOrders._id.toString(),
        orderNumber,
        subOrderNumber,
        orderId: result._id.toString(),
        customer,
        store,
        products,
        escrowAmount,
        deliveryInfo,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      };
    });

    // ==================== Summary Statistics ====================

    /**
     * Calculate Summary Statistics
     *
     * Provides overview statistics for the admin dashboard.
     */
    const totalEscrowAmount = formattedSubOrders.reduce(
      (sum, subOrder) => sum + subOrder.escrowAmount,
      0
    );

    const summary = {
      totalPendingReleases: totalSubOrders,
      totalEscrowAmount,
      averageEscrowAmount:
        totalSubOrders > 0 ? Math.round(totalEscrowAmount / totalSubOrders) : 0,
      oldestPendingDays:
        formattedSubOrders.length > 0
          ? Math.max(
              ...formattedSubOrders.map(
                (s) => s.deliveryInfo.daysSinceReturnWindow
              )
            )
          : 0,
    };

    // ==================== Audit Logging ====================

    /**
     * Log Admin Action
     *
     * Records the admin's escrow queue viewing action for audit purposes.
     */
    await logAdminAction({
      adminId: admin.id,
      adminName: admin.name,
      adminEmail: admin.email,
      adminRoles: admin.roles as Role[],
      action: AUDIT_ACTIONS.ORDER_VIEWED,
      module: AUDIT_MODULES.FINANCE,
      details: {
        viewType: "escrow_release_queue",
        filters: {
          page,
          limit,
          fromDate: fromDate?.toISOString(),
          toDate: toDate?.toISOString(),
          storeId,
          search,
        },
        resultCount: formattedSubOrders.length,
        totalEscrowAmount,
      },
    });

    // ==================== Response ====================

    /**
     * Return Formatted Response
     *
     * Sends back the formatted sub-orders along with pagination metadata
     * and summary statistics.
     */
    return NextResponse.json({
      success: true,
      subOrders: formattedSubOrders,
      summary,
      pagination: {
        page,
        limit,
        total: totalSubOrders,
        pages: Math.ceil(totalSubOrders / limit),
      },
      filters: {
        fromDate: fromDate?.toISOString() || null,
        toDate: toDate?.toISOString() || null,
        storeId: storeId || null,
        search: search || "",
      },
    });
  } catch (error) {
    // ==================== Error Handling ====================

    /**
     * Comprehensive Error Handling
     *
     * Logs errors for debugging while providing user-friendly error messages.
     */
    console.error("Admin escrow release queue fetch error:", error);

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
        message:
          "Failed to fetch escrow release queue. Please try again later.",
      },
      { status: 500 }
    );
  }
}
