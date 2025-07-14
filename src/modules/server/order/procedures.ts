import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getOrderById, getOrderModel } from "@/lib/db/models/order.model";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";
import {
  formatOrderDocument,
  formatOrderDocuments,
} from "@/lib/utils/order-formatter";
import type { RawOrderDocument } from "@/types/order";

/**
 * Order Router with Type-Safe Procedures
 *
 * Provides fully typed tRPC procedures for order management operations.
 * All procedures include comprehensive error handling, input validation,
 * and proper data formatting for client consumption.
 */
export const orderRouter = createTRPCRouter({
  /**
   * Get Orders by User ID Procedure
   *
   * Retrieves all orders for a specific user with complete population
   * of related documents (stores, products). Implements proper error
   * handling and data formatting for consistent client-side consumption.
   *
   * Features:
   * - Input validation with Zod schema
   * - Comprehensive MongoDB population
   * - Type-safe data transformation
   * - Proper error handling with meaningful messages
   * - Optimized query with selective field projection
   *
   * @param input.userId - The user ID to fetch orders for
   * @returns Array of formatted orders with populated data
   */
  getByUserId: baseProcedure
    .input(
      z.object({
        userId: z.string().min(1, "User ID is required"),
      })
    )
    .query(async ({ input }) => {
      try {
        // Ensure database connection
        await connectToDatabase();
        const Order = await getOrderModel();

        // Validate user ID format
        if (!mongoose.Types.ObjectId.isValid(input.userId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid user ID format",
          });
        }

        /**
         * Execute Optimized Database Query
         *
         * Fetch orders with comprehensive population of related documents.
         * Uses selective field projection to optimize performance while
         * ensuring all necessary data is available for formatting.
         */
        const rawOrders = await Order.find({ user: input.userId })
          .populate({
            path: "subOrders.products.Product",
            model: "Product",
            select: "_id name images price productType storeID",
          })
          .populate({
            path: "subOrders.store",
            model: "Store", // Ensure this matches your actual model name
            select: "_id name storeEmail logoUrl",
          })
          .select(
            "_id user stores totalAmount paymentStatus paymentMethod " +
              "shippingAddress notes discount taxAmount createdAt updatedAt subOrders"
          )
          .sort({ createdAt: -1 })
          .lean<RawOrderDocument[]>()
          .exec();

        // Handle case where no orders are found
        if (!rawOrders || rawOrders.length === 0) {
          return []; // Return empty array instead of throwing error for better UX
        }

        /**
         * Format Orders with Type Safety
         *
         * Transform raw MongoDB documents into properly typed,
         * client-ready format. Includes error handling for any
         * data inconsistencies or population failures.
         */
        const formattedOrders = formatOrderDocuments(rawOrders);

        console.log(
          `Successfully retrieved ${formattedOrders.length} orders for user ${input.userId}`
        );

        return formattedOrders;
      } catch (error) {
        console.error("Error in getByUserId procedure:", error);

        // Handle specific error types with appropriate responses
        if (error instanceof TRPCError) {
          throw error;
        }

        if (error instanceof Error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to retrieve orders: ${error.message}`,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while retrieving orders",
        });
      }
    }),

  /**
   * Get Order by Order ID Procedure
   *
   * Retrieves a single order by its ID with complete population
   * of related documents. Includes comprehensive validation and
   * error handling for robust operation.
   *
   * Features:
   * - ObjectId validation before database query
   * - Comprehensive document population
   * - Type-safe data transformation
   * - Detailed error messages for debugging
   * - Optimized single-document retrieval
   *
   * @param input.orderId - The order ID to retrieve
   * @returns Single formatted order with populated data
   */
  getByOrderId: baseProcedure
    .input(
      z.object({
        orderId: z.string().min(1, "Order ID is required"),
      })
    )
    .query(async ({ input }) => {
      try {
        // Validate ObjectId format before database query
        if (!mongoose.Types.ObjectId.isValid(input.orderId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid order ID format",
          });
        }

        // Ensure database connection
        await connectToDatabase();

        /**
         * Retrieve Order with Population
         *
         * Use the existing getOrderById utility function which already
         * includes proper population. This maintains consistency with
         * other parts of the application.
         */
        const rawOrder = (await getOrderById(
          input.orderId,
          true
        )) as RawOrderDocument | null;

        // Handle case where order is not found
        if (!rawOrder) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Order with ID ${input.orderId} not found`,
          });
        }

        /**
         * Format Order with Type Safety
         *
         * Transform the raw MongoDB document into a properly typed,
         * client-ready format. Includes validation of populated data.
         */
        const formattedOrder = formatOrderDocument(rawOrder);

        console.log(`Successfully retrieved order ${input.orderId}`);

        return formattedOrder;
      } catch (error) {
        console.error("Error in getByOrderId procedure:", error);

        // Handle specific error types with appropriate responses
        if (error instanceof TRPCError) {
          throw error;
        }

        if (error instanceof Error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to retrieve order: ${error.message}`,
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "An unexpected error occurred while retrieving the order",
        });
      }
    }),

  /**
   * Get Order Summary by User ID Procedure
   *
   * Retrieves a summary of orders for a user including statistics
   * and recent order information. Useful for dashboard displays.
   *
   * @param input.userId - The user ID to get summary for
   * @returns Order summary with statistics
   */
  getOrderSummaryByUserId: baseProcedure
    .input(
      z.object({
        userId: z.string().min(1, "User ID is required"),
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ input }) => {
      try {
        await connectToDatabase();
        const Order = await getOrderModel();

        // Validate user ID format
        if (!mongoose.Types.ObjectId.isValid(input.userId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid user ID format",
          });
        }

        /**
         * Parallel Queries for Efficiency
         *
         * Execute multiple queries simultaneously to gather
         * comprehensive order statistics and recent orders.
         */
        const [totalOrders, recentOrders, orderStats] = await Promise.all([
          // Total order count
          Order.countDocuments({ user: input.userId }),

          // Recent orders with basic info
          Order.find({ user: input.userId })
            .select("_id totalAmount paymentStatus createdAt")
            .sort({ createdAt: -1 })
            .limit(input.limit)
            .lean(),

          // Order statistics aggregation
          Order.aggregate([
            { $match: { user: new mongoose.Types.ObjectId(input.userId) } },
            {
              $group: {
                _id: null,
                totalSpent: { $sum: "$totalAmount" },
                averageOrderValue: { $avg: "$totalAmount" },
                statusCounts: {
                  $push: "$paymentStatus",
                },
              },
            },
          ]),
        ]);

        return {
          totalOrders,
          totalSpent: orderStats[0]?.totalSpent || 0,
          averageOrderValue: orderStats[0]?.averageOrderValue || 0,
          recentOrders: recentOrders.map((order) => ({
            _id: order._id.toString(),
            totalAmount: order.totalAmount,
            paymentStatus: order.paymentStatus,
            createdAt: order.createdAt,
          })),
        };
      } catch (error) {
        console.error("Error in getOrderSummaryByUserId procedure:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve order summary",
        });
      }
    }),
});
