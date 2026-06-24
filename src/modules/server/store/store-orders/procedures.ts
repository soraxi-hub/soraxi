import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { OrderService } from "@/services/orders/order.service";

const orderService = new OrderService();

export const storeOrdersRouter = createTRPCRouter({
  getStoreOrderById: baseProcedure
    .input(
      z.object({
        orderId: z.string().min(1, "Order ID is required"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { store } = ctx;
      const { orderId } = input;

      if (!store?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Store authentication required to access order details",
        });
      }

      return await orderService.getOrderStoreView(orderId, store.id);
    }),

  /**
   * Get Store Orders Procedure
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
   */
  getStoreOrders: baseProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        deliveryStatus: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      }),
    )
    // .output(GetStoreOrdersOutputSchema) // Apply output schema here
    .query(async ({ input, ctx }) => {
      try {
        const { store: storeSession } = ctx;

        if (!storeSession?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Store authentication required to access orders",
          });
        }

        // Call service method
        const result = await orderService.getStoreOrders(storeSession.id, {
          startDate: input.startDate,
          endDate: input.endDate,
          deliveryStatus: input.deliveryStatus,
          page: input.page,
          limit: input.limit,
        });

        return {
          success: true,
          ...result,
        };
      } catch (error) {
        console.error("Store orders fetch error:", error);

        // Handle specific error types
        if (error instanceof mongoose.Error.ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid query parameters",
          });
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        // Generic error response
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch orders. Please try again later.",
        });
      }
    }),
});
