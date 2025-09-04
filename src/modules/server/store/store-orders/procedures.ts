import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getOrderModel, IOrder } from "@/lib/db/models/order.model";
import mongoose, { FilterQuery } from "mongoose";
import { PopulatedStore, RawOrderDocument } from "@/types/order";
import { formatStoreOrderDocument } from "@/lib/utils/order-formatter";

export const storeOrdersRouter = createTRPCRouter({
  getStoreOrderById: baseProcedure
    .input(
      z.object({
        orderId: z.string().min(1, "Order ID is required"),
      })
    )
    .query(async ({ ctx, input }) => {
      const { store } = ctx;

      // 🛡️ Authentication: Ensure the store is logged in
      if (!store?.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Store authentication required to access order details",
        });
      }

      const { orderId } = input;

      // 🧪 Validate orderId format
      if (!mongoose.Types.ObjectId.isValid(orderId)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid order ID format",
        });
      }

      const Order = await getOrderModel();

      const rawOrder = (await Order.findById(orderId)
        .populate({
          path: "user",
          model: "User",
          select: "_id firstName lastName email phoneNumber",
        })
        // .populate({
        //   path: "subOrders.products.Product",
        //   model: "Product",
        //   select: "_id name images price productType storeID",
        // })
        .populate({
          path: "subOrders.store",
          model: "Store",
          select: "name storeEmail logo",
        })
        .lean()) as RawOrderDocument | null;

      if (!rawOrder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Order with ID ${orderId} not found`,
        });
      }

      // 🧾 Authorization: Ensure store owns this order
      const storeOwnsOrder = rawOrder.stores.some(
        (storeId) => storeId.toString() === store.id
      );

      if (!storeOwnsOrder) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have permission to access this order",
        });
      }

      // 🧼 Filter subOrders to only include the one(s) belonging to this store
      const storeSubOrders = rawOrder.subOrders.filter(
        (subOrder) =>
          (subOrder.store as PopulatedStore)._id.toString() === store.id
      );

      // If store has no subOrders in this order, block access
      if (storeSubOrders.length === 0) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You don't have access to any sub-orders in this order",
        });
      }

      // Replace subOrders and stores with filtered data
      const filteredOrder: RawOrderDocument = {
        ...rawOrder,
        stores: rawOrder.stores.filter(
          (sId) => sId.toString() === store.id
        ) as mongoose.Types.ObjectId[],
        subOrders: storeSubOrders,
      };

      const formattedOrder = formatStoreOrderDocument(filteredOrder, store.id);

      // console.log(`Successfully retrieved order ${orderId}`);

      return {
        success: true,
        order: formattedOrder,
      };
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
        // Date filtering parameters
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        // Status and search filtering
        deliveryStatus: z.string().optional(),
        searchQuery: z.string().optional(),
        // Pagination parameters with defaults
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    // .output(GetStoreOrdersOutputSchema) // Apply output schema here
    .query(async ({ input, ctx }) => {
      try {
        const { store: storeSession } = ctx;
        // ==================== Authentication & Authorization ====================
        if (!storeSession?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Store authentication required to access orders",
          });
        }

        // ==================== Database Query Construction ====================
        const Order = await getOrderModel();

        // Base match conditions for store-specific orders
        const matchConditions: FilterQuery<IOrder> = {
          stores: new mongoose.Types.ObjectId(storeSession.id),
        };

        // Date range filtering
        if (input.startDate && input.endDate) {
          const start = new Date(input.startDate);
          const end = new Date(input.endDate);

          // Validate date range
          if (start > end) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Start date must be before end date",
            });
          }

          matchConditions.createdAt = {
            $gte: start,
            $lte: end,
          };
        }

        // Delivery status filtering
        if (input.deliveryStatus && input.deliveryStatus !== "all") {
          matchConditions["subOrders.deliveryStatus"] = input.deliveryStatus;
        }

        // Search functionality across multiple fields
        if (input.searchQuery && input.searchQuery.trim()) {
          const searchRegex = new RegExp(input.searchQuery.trim(), "i");
          // Note: For search on populated fields like 'user.name' or 'subOrders.products.Product.name',
          // Mongoose's find() with direct population might not work as expected for $regex on nested fields.
          // A more robust solution for complex searches on populated data often involves aggregation pipelines.
          // For this example, we'll assume direct field matching or a text index is sufficient.
          matchConditions.$or = [
            { _id: { $regex: searchRegex } },
            // These might require aggregation $lookup and $unwind for proper search on populated fields
            // { "user.firstName": { $regex: searchRegex } }, // Assuming user is populated
            // { "user.lastName": { $regex: searchRegex } },
            // { "user.email": { $regex: searchRegex } },
            // { "subOrders.products.Product.name": { $regex: searchRegex } },
          ];
        }

        // Calculate skip for pagination
        const skip = (input.page - 1) * input.limit;

        // ==================== Execute Database Queries ====================
        const [orders, totalCount] = await Promise.all([
          // Main orders query with population and pagination
          Order.find(matchConditions)
            .populate({
              path: "user",
              model: "User",
              select: "_id firstName lastName email phoneNumber", // Changed 'name' to 'firstName lastName'
            })
            .populate({
              path: "subOrders.products.Product",
              model: "Product",
              select: "_id name images price productType category subCategory",
            })
            .populate({
              path: "subOrders.store",
              model: "Store",
              select: "_id name storeEmail logoUrl", // Changed 'logo' to 'logoUrl'
            })
            .select(
              "_id user stores totalAmount paymentStatus paymentMethod " +
                "shippingAddress notes discount taxAmount createdAt updatedAt subOrders"
            )
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(input.limit)
            .lean()
            .transform((docs) => {
              // This transform filters subOrders to only include those belonging to the current store
              return docs.map((doc) => ({
                ...doc,
                subOrders: doc.subOrders.filter(
                  (subOrder) =>
                    (subOrder.store as any)._id.toString() === storeSession.id
                ),
              }));
            })
            .exec(),

          // Count query for pagination metadata
          Order.countDocuments(matchConditions),
        ]);

        // ==================== Response Formatting ====================
        const totalPages = Math.ceil(totalCount / input.limit);
        const hasNextPage = input.page < totalPages;
        const hasPrevPage = input.page > 1;

        // Format each order document using the utility function
        const formattedOrders = orders.map((order) =>
          formatStoreOrderDocument(order as any, storeSession.id)
        );

        console.log(
          `Store ${storeSession.id} fetched ${formattedOrders.length} orders (page ${input.page}/${totalPages})`
        );

        return {
          success: true,
          orders: formattedOrders,
          pagination: {
            currentPage: input.page,
            totalPages,
            totalCount,
            hasNextPage,
            hasPrevPage,
            limit: input.limit,
          },
          filters: {
            dateRange:
              input.startDate && input.endDate
                ? { startDate: input.startDate, endDate: input.endDate }
                : null,
            deliveryStatus: input.deliveryStatus || "all",
            searchQuery: input.searchQuery || "",
          },
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

        if (error instanceof mongoose.Error.CastError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "One or more parameters have invalid format",
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
