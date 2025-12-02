import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getOrderModel } from "@/lib/db/models/order.model";
import { getUserModel } from "@/lib/db/models/user.model";
import { checkAdminPermission } from "@/modules/admin/security/access-control";
import type { ISubOrder } from "@/lib/db/models/order.model";
import {
  logAdminAction,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
} from "@/modules/admin/security/audit-logger";
import mongoose from "mongoose";
import { Role } from "@/modules/admin/security/roles";
import { DeliveryStatus } from "@/enums";
import { PERMISSIONS } from "@/modules/admin/security/permissions";

// ==================== Response Formatting ====================

/**
 * Interface for the formatted delivery confirmation response
 */
interface FormattedDeliveryConfirmation {
  id: string;
  orderNumber: string;
  subOrderId: string;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  store: {
    id: string;
    name: string;
    email: string;
  };
  deliveryDate: string;
  deliveryStatus: ISubOrder["deliveryStatus"]; // Using the type from ISubOrder interface
}

/**
 * Interface for the aggregation pipeline result item
 */
interface AggregationResultItem {
  _id: mongoose.Types.ObjectId;
  orderNumber: string;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    _id: mongoose.Types.ObjectId;
    firstName: string;
    lastName: string;
    email: string;
  };
  store: {
    _id: mongoose.Types.ObjectId;
    name: string;
    storeEmail: string;
  };
  subOrder: ISubOrder & { _id: mongoose.Types.ObjectId }; // Combining ISubOrder with _id field
}

/**
 * Delivery Confirmation TRPC Router
 *
 * Provides functionality for platform administrators to view and manage
 * sub-orders that require manual delivery confirmation. This includes orders
 * that have been marked as Delivered but not confirmed by customers for more than 2 days.
 *
 * Business Logic:
 * - deliveryStatus = "Delivered"
 * - customerConfirmedDelivery.confirmed = false
 * - customerConfirmedDelivery.autoConfirmed = false
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

export const deliveryConfirmationRouter = createTRPCRouter({
  /**
   * GET Handler - Retrieve Delivery Confirmation Queue
   *
   * Fetches a paginated list of sub-orders that require manual delivery confirmation
   * based on the specified filters.
   */
  getConfirmationQueue: baseProcedure
    .input(
      z.object({
        // Pagination parameters
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),

        // Search term for customer lookup
        search: z.string().optional(),

        // Date range filters
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        const { admin } = ctx;
        // ==================== Authentication & Authorization ====================

        /**
         * Admin Authentication Check
         *
         * Verifies that the request is coming from an authenticated admin user
         * with appropriate permissions to view the delivery confirmation queue.
         */
        // const admin = getAdminFromRequest(ctx.admin);
        if (
          !admin ||
          !checkAdminPermission(admin, [PERMISSIONS.STALE_ORDERS])
        ) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          });
        }

        // ==================== Request Parameters ====================

        /**
         * Extract and Process Query Parameters
         */
        const { page, limit, search, fromDate, toDate } = input;
        const skip = (page - 1) * limit;

        // Process date parameters
        const fromDateObj = fromDate ? new Date(fromDate) : null;
        const toDateObj = toDate ? new Date(toDate) : null;

        // Adjust toDate to end of day if provided
        if (toDateObj) toDateObj.setHours(23, 59, 59, 999);

        // ==================== Query Construction ====================

        /**
         * Base Match Conditions
         *
         * Defines the core criteria for sub-orders that should appear in the
         * delivery confirmation queue.
         */
        const Order = await getOrderModel();
        const baseMatch: any = {
          "subOrders.deliveryStatus": DeliveryStatus.Delivered,
          "subOrders.customerConfirmedDelivery.confirmed": false,
          "subOrders.customerConfirmedDelivery.autoConfirmed": false,
          "subOrders.deliveryDate": { $lte: twoDaysAgo },
        };

        // Apply date range filter if provided
        if (fromDateObj || toDateObj) {
          baseMatch["subOrders.deliveryDate"] = {
            ...baseMatch["subOrders.deliveryDate"],
            ...(fromDateObj && { $gte: fromDateObj }),
            ...(toDateObj && { $lte: toDateObj }),
          };
        }

        // ==================== Search Logic ====================

        /**
         * Handle Search Functionality
         */
        let userIds: mongoose.Types.ObjectId[] = [];
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
         */
        const pipeline: mongoose.PipelineStage[] = [
          // Initial match for orders with qualifying sub-orders
          { $match: baseMatch },

          // Unwind sub-orders to process individually
          { $unwind: { path: "$subOrders" } },

          // Apply sub-order specific filters
          {
            $match: {
              "subOrders.deliveryStatus": DeliveryStatus.Delivered,
              "subOrders.customerConfirmedDelivery.confirmed": false,
              "subOrders.customerConfirmedDelivery.autoConfirmed": false,
              "subOrders.deliveryDate": { $lte: twoDaysAgo },
              ...(userIds.length > 0 ? { user: { $in: userIds } } : {}),
            },
          },

          // Populate customer data
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "userData",
            },
          },

          // Populate store data
          {
            $lookup: {
              from: "stores",
              localField: "subOrders.storeId",
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
         * Transforms the raw aggregation results into a properly typed response format
         * with consistent structure and type safety.
         */
        const formatted: FormattedDeliveryConfirmation[] = results.map(
          (item: AggregationResultItem) => ({
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
            deliveryDate:
              item.subOrder.deliveryDate?.toISOString() ||
              new Date().toISOString(),
            deliveryStatus: item.subOrder.deliveryStatus,
          })
        );

        // ==================== Audit Logging ====================

        /**
         * Log Admin Action
         */
        // await logAdminAction({
        //   adminId: admin.id,
        //   adminName: admin.name,
        //   adminEmail: admin.email,
        //   adminRoles: admin.roles as Role[],
        //   action: AUDIT_ACTIONS.DELIVERY_CONFIRMATION_QUEUE_VIEWED,
        //   module: AUDIT_MODULES.DELIVERIES,
        //   details: {
        //     filters: { page, limit, search, fromDate, toDate },
        //     resultCount: formatted.length,
        //   },
        // });

        // ==================== Response ====================

        /**
         * Return Formatted Response
         */
        return {
          success: true,
          deliveryConfirmations: formatted,
          pagination: { page, limit, total, pages: Math.ceil(total / limit) },
        };
      } catch (error) {
        // ==================== Error Handling ====================

        /**
         * Handle Errors
         */
        console.error("Delivery confirmation error:", error);

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

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Failed to fetch delivery confirmations. Please try again later.",
        });
      }
    }),

  /**
   * POST Handler - Manually Confirm Delivery
   *
   * Allows administrators to manually confirm delivery for a sub-order when
   * the customer hasn't confirmed within the required timeframe.
   *
   * Business Logic:
   * - Updates customerConfirmedDelivery.autoConfirmed to mark as confirmed (by the system).
   * - Records the manual confirmation timestamp.
   * - We do not release the escrow here. We only release the escrow when the return window has elapsed.
   */
  autoConfirmDelivery: baseProcedure
    .input(
      z.object({
        subOrderId: z
          .string()
          .refine((val) => mongoose.Types.ObjectId.isValid(val), {
            message: "Invalid sub-order ID",
          }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { admin } = ctx;
      try {
        // ==================== Authentication & Authorization ====================

        /**
         * Admin Authentication Check
         */
        if (
          !admin ||
          !checkAdminPermission(admin, [PERMISSIONS.STALE_ORDERS])
        ) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Unauthorized",
          });
        }

        // ==================== Request Validation ====================

        /**
         * Validate Request Body
         */
        const { subOrderId } = input;

        // ==================== Database Update ====================

        /**
         * Find and Update Sub-Order
         */
        const Order = await getOrderModel();
        const now = new Date();

        // Prepare the status history update
        const statusUpdate = {
          status: DeliveryStatus.Delivered,
          timestamp: now,
          notes: "Delivery auto-confirmed by System.",
        };

        const result = await Order.findOneAndUpdate(
          {
            "subOrders._id": new mongoose.Types.ObjectId(subOrderId),
            "subOrders.deliveryStatus": DeliveryStatus.Delivered,
            "subOrders.customerConfirmedDelivery.confirmed": false,
            "subOrders.$.customerConfirmedDelivery.autoConfirmed": false,
          },
          {
            $set: {
              "subOrders.$.customerConfirmedDelivery.confirmed": false,
              "subOrders.$.customerConfirmedDelivery.confirmedAt": now,
              "subOrders.$.customerConfirmedDelivery.autoConfirmed": true,
            },
            $push: {
              "subOrders.$.statusHistory": statusUpdate,
            },
          },
          { new: true } // Return the updated document
        );

        // Handle case where sub-order not found or already confirmed
        if (!result) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Sub-order not found or already confirmed",
          });
        }

        // Extract the updated sub-order from the result
        const updatedSubOrder = result.subOrders.find(
          (so: any) => so._id?.toString() === subOrderId
        );

        if (!updatedSubOrder || !updatedSubOrder._id) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Updated sub-order not found",
          });
        }

        // ==================== Audit Logging ====================

        /**
         * Log Admin Action
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
         */
        return {
          success: true,
          subOrder: {
            id: updatedSubOrder._id.toString(),
            customerConfirmedDelivery:
              updatedSubOrder.customerConfirmedDelivery,
          },
          message: `Delivery for sub-order ${updatedSubOrder._id.toString()} has been manually confirmed by admin.`,
        };
      } catch (error) {
        // ==================== Error Handling ====================

        /**
         * Handle Errors
         */
        console.error("Manual confirmation error:", error);

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

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to confirm delivery. Please try again later.",
        });
      }
    }),
});
