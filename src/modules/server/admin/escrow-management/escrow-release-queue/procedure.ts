import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getOrderModel } from "@/lib/db/models/order.model";
import { checkAdminPermission } from "@/modules/admin/security/access-control";
import {
  logAdminAction,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
} from "@/modules/admin/security/audit-logger";
import mongoose from "mongoose";
import type { Role } from "@/modules/admin/security/roles";
import type { EscrowReleaseAggregationResult } from "@/types/escrow-aggregation";
// import { currencyOperations } from "@/lib/utils/naira";

/**
 * Admin Escrow Release TRPC Router
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
 * - Full TypeScript typing for aggregation results
 *
 * Security:
 * - Admin authentication and authorization
 * - Input validation and sanitization
 * - Comprehensive error handling and logging
 */
export const adminEscrowReleaseQueueRouter = createTRPCRouter({
  /**
   * GET Handler - Retrieve Escrow Release Queue
   *
   * Fetches a paginated list of sub-orders eligible for escrow release
   * based on the specified filters. Uses MongoDB aggregation pipeline
   * for optimal performance and data transformation.
   */
  getEscrowReleaseQueue: baseProcedure
    .input(
      z.object({
        // Pagination parameters
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),

        // Date range parameters
        fromDate: z.string().optional(),
        toDate: z.string().optional(),

        // Store filter
        storeId: z.string().optional(),

        // Search parameters
        search: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const { admin } = ctx;
      try {
        // ==================== Authentication & Authorization ====================

        /**
         * Admin Authentication Check
         *
         * Verifies that the request is coming from an authenticated admin user
         * with appropriate permissions to view escrow release data.
         */
        if (!admin || !checkAdminPermission(admin, [])) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Admin authentication required",
          });
        }

        // ==================== Request Parameters ====================

        /**
         * Extract and Process Query Parameters
         */
        const { page, limit, fromDate, toDate, storeId, search } = input;
        const skip = (page - 1) * limit;

        // Process date parameters
        const fromDateObj = fromDate ? new Date(fromDate) : null;
        const toDateObj = toDate ? new Date(toDate) : null;

        // If toDate is provided, set it to the end of the day
        if (toDateObj) {
          toDateObj.setHours(23, 59, 59, 999);
        }

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
         *
         * The pipeline is designed for optimal performance and returns data
         * in the exact shape defined by EscrowReleaseAggregationResult interface.
         */
        const Order = await getOrderModel();

        // Base pipeline to unwind sub-orders and filter eligible ones
        const basePipeline: mongoose.PipelineStage[] = [
          /**
           * Stage 1: Unwind sub-orders
           *
           * Converts each order document with an array of sub-orders into
           * multiple documents, each containing one sub-order. This allows
           * us to filter and process individual sub-orders.
           */
          { $unwind: "$subOrders" },

          /**
           * Stage 2: Filter for escrow release eligibility
           *
           * Only includes sub-orders that meet all criteria for escrow release:
           * - Funds are currently held in escrow
           * - Funds haven't been released yet
           * - Order has been delivered
           * - Return window has expired
           */
          {
            $match: {
              "subOrders.escrow.held": true,
              "subOrders.escrow.released": false,
              "subOrders.deliveryStatus": "Delivered",
              "subOrders.returnWindow": { $lt: new Date() }, // Return window has passed
            },
          },
        ];

        /**
         * Stage 3: Apply date range filter (if provided)
         *
         * Filters orders based on their creation date to help admins
         * focus on orders from specific time periods.
         */
        if (fromDateObj || toDateObj) {
          const dateFilter: Record<string, Date> = {};
          if (fromDateObj) dateFilter.$gte = fromDateObj;
          if (toDateObj) dateFilter.$lte = toDateObj;

          basePipeline.push({
            $match: {
              createdAt: dateFilter,
            },
          });
        }

        /**
         * Stage 4: Apply store filter (if provided)
         *
         * Allows admins to view escrow releases for a specific store.
         * Validates ObjectId format before applying the filter.
         */
        if (storeId && mongoose.Types.ObjectId.isValid(storeId)) {
          basePipeline.push({
            $match: {
              "subOrders.store": new mongoose.Types.ObjectId(storeId),
            },
          });
        }

        /**
         * Stage 5: Populate user data
         *
         * Joins with the users collection to get customer information.
         * Only projects essential fields to optimize performance.
         */
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

        /**
         * Stage 6: Populate store data
         *
         * Joins with the stores collection to get store information.
         * Essential for displaying store details in the admin interface.
         */
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

        /**
         * Stage 7: Add computed fields
         *
         * Transforms the populated arrays into single objects for easier access
         * and calculates the number of days since the return window expired.
         * This computed field helps admins prioritize overdue releases.
         */
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

        /**
         * Stage 8: Apply search filter (if provided)
         *
         * Enables text search across customer names, emails, and store information.
         * Uses case-insensitive regex matching for flexible search functionality.
         */
        if (search && search.trim()) {
          basePipeline.push({
            $match: {
              $or: [
                {
                  "userDetails.firstName": {
                    $regex: search.trim(),
                    $options: "i",
                  },
                },
                {
                  "userDetails.lastName": {
                    $regex: search.trim(),
                    $options: "i",
                  },
                },
                {
                  "userDetails.email": {
                    $regex: search.trim(),
                    $options: "i",
                  },
                },
                {
                  "storeDetails.name": {
                    $regex: search.trim(),
                    $options: "i",
                  },
                },
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

        /**
         * Stage 9: Sort results
         *
         * Orders results by return window date (oldest first) to prioritize
         * the most overdue escrow releases for admin attention.
         */
        basePipeline.push({
          $sort: { "subOrders.returnWindow": 1 },
        });

        // ==================== Execute Aggregation ====================

        /**
         * Execute Database Queries
         *
         * Runs the aggregation pipeline to get both the data and total count
         * for pagination purposes. The count pipeline reuses the base pipeline
         * for consistency.
         */

        // Count total matching documents
        const countPipeline = [...basePipeline, { $count: "total" }];
        const countResult = await Order.aggregate(countPipeline);
        const totalSubOrders = countResult[0]?.total || 0;

        // Get paginated results with proper TypeScript typing
        const dataPipeline = [
          ...basePipeline,
          { $skip: skip },
          { $limit: limit },
        ];

        /**
         * Execute the aggregation pipeline with full type safety
         *
         * The results are now properly typed as EscrowReleaseAggregationResult[]
         * instead of any[], providing compile-time type checking and better
         * IntelliSense support for developers.
         */
        const results: EscrowReleaseAggregationResult[] = await Order.aggregate(
          dataPipeline
        );

        // ==================== Response Formatting ====================

        /**
         * Format Sub-Orders for Response
         *
         * Transforms the aggregation results into a properly formatted
         * response with consistent types and structure. The typing ensures
         * that all property accesses are safe and well-defined.
         */
        const formattedSubOrders = results.map((result) => {
          // Generate readable IDs for better admin UX
          // const orderNumber = `ORD-${(result._id as { toString(): string })
          //   .toString()
          //   .substring(0, 8)
          //   .toUpperCase()}`;
          // const subOrderNumber = `SUB-${result.subOrders._id
          //   ?.toString()
          //   .substring(0, 8)
          //   .toUpperCase()}`;
          const orderNumber = (result._id as { toString(): string }).toString();
          const subOrderNumber = result.subOrders._id?.toString();

          /**
           * Format customer information
           *
           * With proper typing, we can safely access userDetails properties
           * without worrying about undefined values or type mismatches.
           */
          const customer = {
            id: result.userDetails._id.toString(),
            name: `${result.userDetails.firstName} ${result.userDetails.lastName}`,
            email: result.userDetails.email,
            phone: result.userDetails.phoneNumber || null,
          };

          /**
           * Format store information
           *
           * TypeScript ensures we're accessing the correct properties
           * from the populated store data.
           */
          const store = {
            id: result.storeDetails._id.toString(),
            name: result.storeDetails.name,
            email: result.storeDetails.storeEmail,
            logo: result.storeDetails.logoUrl || null,
          };

          // // Calculate escrow amount (sub-order total)
          // const escrowAmount = currencyOperations.add(
          //   result.subOrders.totalAmount,
          //   result.subOrders.shippingMethod?.price ?? 0
          // );
          // Calculate escrow amount (sub-order total)
          const escrowAmount = {
            totalCost: result.subOrders.totalAmount,
            shippingCost: result.subOrders.shippingMethod?.price ?? 0,
          };

          /**
           * Format delivery information
           *
           * Includes computed field (daysSinceReturnWindow) that was
           * calculated in the aggregation pipeline.
           */
          const deliveryInfo = {
            status: result.subOrders.deliveryStatus,
            deliveredAt: result.subOrders.deliveryDate as Date,
            returnWindow: result.subOrders.returnWindow,
            daysSinceReturnWindow: Math.floor(result.daysSinceReturnWindow),
            customerConfirmed:
              result.subOrders.customerConfirmedDelivery?.confirmed || false,
            autoConfirmed:
              result.subOrders.customerConfirmedDelivery?.autoConfirmed ||
              false,
          };

          /**
           * Format product information
           *
           * Maps through the sub-order products and uses the stored productSnapshot
           * data for consistent product information at the time of order.
           */
          const products = result.subOrders.products.map((product) => {
            return {
              id: product.Product.toString(),
              name: product.productSnapshot?.name || "Unknown Product",
              quantity: product.productSnapshot?.quantity || 0,
              price: product.productSnapshot.price,
              image: product.productSnapshot?.images?.[0] || null,
            };
          });

          return {
            id: result.subOrders._id?.toString() || "",
            orderNumber,
            subOrderNumber,
            orderId: (result._id as { toString(): string }).toString(),
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
         * Provides overview statistics for the admin dashboard to help
         * administrators understand the scope of pending escrow releases.
         * We don't include shipping costs in the total escrow amount.
         */
        const totalEscrowAmount = formattedSubOrders.reduce(
          (sum, subOrder) => sum + subOrder.escrowAmount.totalCost,
          0
        );

        const summary = {
          totalPendingReleases: totalSubOrders,
          totalEscrowAmount,
          averageEscrowAmount:
            totalSubOrders > 0
              ? Math.round(totalEscrowAmount / totalSubOrders)
              : 0,
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
         * This helps maintain a complete audit trail of admin activities.
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
              fromDate: fromDateObj?.toISOString(),
              toDate: toDateObj?.toISOString(),
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
         * and summary statistics. All data is properly typed and validated.
         */
        return {
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
            fromDate: fromDateObj?.toISOString() || null,
            toDate: toDateObj?.toISOString() || null,
            storeId: storeId || null,
            search: search || "",
          },
        };
      } catch (error) {
        // ==================== Error Handling ====================

        /**
         * Comprehensive Error Handling
         *
         * Logs errors for debugging while providing user-friendly error messages.
         * Different error types are handled appropriately to provide meaningful
         * feedback to the client.
         */
        console.error("Admin escrow release queue fetch error:", error);

        // Handle specific MongoDB error types
        if (error instanceof mongoose.Error.ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The request contains invalid data",
          });
        }

        if (error instanceof mongoose.Error.CastError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "One or more IDs in the request are invalid",
          });
        }

        // Re-throw TRPC errors as-is
        if (error instanceof TRPCError) {
          throw error;
        }

        // Generic error fallback
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Failed to fetch escrow release queue. Please try again later.",
        });
      }
    }),
});
