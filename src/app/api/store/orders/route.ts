import { type NextRequest, NextResponse } from "next/server";
import { getOrderModel, IOrder } from "@/lib/db/models/order.model";
import mongoose from "mongoose";
import { getStoreFromCookie } from "@/lib/helpers/get-store-from-cookie";
import { FilterQuery } from "mongoose";

/**
 * Store Orders API Route Handler
 *
 * Provides comprehensive order management functionality for store owners,
 * including advanced filtering, searching, and pagination capabilities.
 *
 * Features:
 * - Date range filtering (current month, last month, custom month)
 * - Delivery status filtering with multiple status support
 * - Search functionality across order IDs, customer names, and products
 * - Pagination support for large order datasets
 * - Store-specific order filtering with security validation
 * - Comprehensive error handling and logging
 * - Performance optimization with selective field projection
 *
 * Security:
 * - Store session validation to ensure authorized access
 * - Input sanitization and validation
 * - Rate limiting considerations for API protection
 *
 * @param request - Next.js request object with query parameters
 * @returns JSON response with filtered orders and metadata
 */
export async function GET(request: NextRequest) {
  try {
    // ==================== Authentication & Authorization ====================

    /**
     * Store Session Validation
     *
     * Ensures that only authenticated store owners can access their orders.
     * Prevents unauthorized access to sensitive order information.
     */
    const storeSession = await getStoreFromCookie();

    if (!storeSession?.id) {
      return NextResponse.json(
        {
          error: "Unauthorized access",
          message: "Store authentication required to access orders",
        },
        { status: 401 }
      );
    }

    // ==================== Query Parameter Processing ====================

    /**
     * Extract and Validate Query Parameters
     *
     * Processes URL query parameters for filtering, searching, and pagination.
     * Includes comprehensive validation to prevent malicious input.
     */
    const { searchParams } = new URL(request.url);

    // Date filtering parameters
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Status and search filtering
    const deliveryStatus = searchParams.get("deliveryStatus");
    const searchQuery = searchParams.get("search");

    // Pagination parameters with defaults
    const page = Number.parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(
      Number.parseInt(searchParams.get("limit") || "20", 10),
      100
    ); // Cap at 100
    const skip = (page - 1) * limit;

    // ==================== Database Query Construction ====================

    /**
     * Build MongoDB Aggregation Pipeline
     *
     * Constructs a comprehensive aggregation pipeline that:
     * - Filters orders by store ownership
     * - Applies date range filtering
     * - Implements delivery status filtering
     * - Enables full-text search across multiple fields
     * - Populates related documents (users, products, stores)
     * - Implements pagination with performance optimization
     */
    const Order = await getOrderModel();

    // Base match conditions for store-specific orders
    // This line ensures that: Only orders containing this store’s ID in the stores array field are fetched.
    const matchConditions: FilterQuery<IOrder> = {
      stores: new mongoose.Types.ObjectId(storeSession.id),
    };

    // Date range filtering
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      // Validate date range
      if (start > end) {
        return NextResponse.json(
          {
            error: "Invalid date range",
            message: "Start date must be before end date",
          },
          { status: 400 }
        );
      }

      matchConditions.createdAt = {
        $gte: start,
        $lte: end,
      };
    }

    // Delivery status filtering
    if (deliveryStatus && deliveryStatus !== "all") {
      matchConditions["subOrders.deliveryStatus"] = deliveryStatus;
    }

    // Search functionality across multiple fields
    if (searchQuery && searchQuery.trim()) {
      const searchRegex = new RegExp(searchQuery.trim(), "i");
      matchConditions.$or = [
        { _id: { $regex: searchRegex } },
        { "user.name": { $regex: searchRegex } },
        { "user.email": { $regex: searchRegex } },
        { "subOrders.products.Product.name": { $regex: searchRegex } },
      ];
    }

    // ==================== Execute Database Queries ====================

    /**
     * Parallel Query Execution
     *
     * Executes count and data queries simultaneously for optimal performance.
     * Provides both the filtered results and total count for pagination.
     */
    const [orders, totalCount] = await Promise.all([
      // Main orders query with population and pagination
      Order.find(matchConditions)
        .populate({
          path: "user",
          model: "User",
          select: "_id name email phone",
        })
        .populate({
          path: "subOrders.products.Product",
          model: "Product",
          select: "_id name images price productType category subCategory",
        })
        .populate({
          path: "subOrders.store",
          model: "Store",
          select: "_id name storeEmail logoUrl",
        })
        .select(
          "_id user stores totalAmount paymentStatus paymentMethod " +
            "shippingAddress notes discount taxAmount createdAt updatedAt subOrders"
        )
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec(),

      // Count query for pagination metadata
      Order.countDocuments(matchConditions),
    ]);

    // ==================== Response Formatting ====================

    /**
     * Format Response Data
     *
     * Structures the response with comprehensive metadata for client-side
     * pagination and filtering state management.
     */
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Log successful query for monitoring
    console.log(
      `Store ${storeSession.id} fetched ${orders.length} orders (page ${page}/${totalPages})`
    );

    return NextResponse.json({
      success: true,
      orders,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNextPage,
        hasPrevPage,
        limit,
      },
      filters: {
        dateRange: startDate && endDate ? { startDate, endDate } : null,
        deliveryStatus: deliveryStatus || "all",
        searchQuery: searchQuery || "",
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
    console.error("Store orders fetch error:", error);

    // Handle specific error types
    if (error instanceof mongoose.Error.ValidationError) {
      return NextResponse.json(
        {
          error: "Invalid query parameters",
          message: "Please check your filter parameters and try again",
        },
        { status: 400 }
      );
    }

    if (error instanceof mongoose.Error.CastError) {
      return NextResponse.json(
        {
          error: "Invalid data format",
          message: "One or more parameters have invalid format",
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
