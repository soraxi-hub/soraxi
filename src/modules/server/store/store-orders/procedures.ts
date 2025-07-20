import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getOrderModel } from "@/lib/db/models/order.model";
import mongoose from "mongoose";
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
        .populate({
          path: "subOrders.products.Product",
          model: "Product",
          select: "_id name images price productType storeID",
        })
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
        stores: rawOrder.stores.filter((sId) => sId.toString() === store.id),
        subOrders: storeSubOrders,
      };

      const formattedOrder = formatStoreOrderDocument(filteredOrder, store.id);

      console.log(`Successfully retrieved order ${orderId}`);

      // 🧼 Format order response
      // const formattedOrder = {
      //   _id: order._id.toString(),
      //   user: {
      //     _id: order.user._id?.toString() || "",
      //     name:
      //       `${order.user.firstName} ${order.user.lastName}` ||
      //       "Unknown Customer",
      //     email: order.user.email || "",
      //     phone: order.user.phoneNumber || null,
      //   },
      //   totalAmount: order.totalAmount,
      //   paymentStatus: order.paymentStatus || "Unknown",
      //   paymentMethod: order.paymentMethod || "Unknown",
      //   shippingAddress: {
      //     postalCode: order.shippingAddress?.postalCode || "",
      //     address: order.shippingAddress?.address || "",
      //   },
      //   notes: order.notes || null,
      //   discount: order.discount || 0,
      //   taxAmount: order.taxAmount || 0,
      //   createdAt: order.createdAt.toISOString(),
      //   updatedAt: order.updatedAt.toISOString(),
      //   subOrders: order.subOrders.map((subOrder) => ({
      //     _id: subOrder._id?.toString() || "",
      //     store: subOrder.store._id?.toString() || "",
      //     products: subOrder.products.map((product) => ({
      //       Product: {
      //         _id: product.Product._id?.toString() || "",
      //         name: product.Product.name || "Unknown Product",
      //         images: product.Product.images || [],
      //         price: product.Product.price || 0,
      //         productType: product.Product.productType || "Product",
      //         category: product.Product.category || [],
      //         subCategory: product.Product.subCategory || [],
      //       },
      //       quantity: product.quantity,
      //       price: product.price,
      //       selectedSize: product.selectedSize || null,
      //     })),
      //     totalAmount: subOrder.totalAmount,
      //     deliveryStatus: subOrder.deliveryStatus,
      //     shippingMethod: subOrder.shippingMethod || null,
      //     trackingNumber: subOrder.trackingNumber || null,
      //     deliveryDate: subOrder.deliveryDate?.toISOString() || null,
      //     escrow: {
      //       held: subOrder.escrow?.held || false,
      //       released: subOrder.escrow?.released || false,
      //       releasedAt: subOrder.escrow?.releasedAt?.toISOString() || null,
      //       refunded: subOrder.escrow?.refunded || false,
      //       refundReason: subOrder.escrow?.refundReason || null,
      //     },
      //     returnWindow: subOrder.returnWindow?.toISOString() || null,
      //   })),
      // };

      return {
        success: true,
        order: formattedOrder,
      };
    }),

  getStoreOrders: baseProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        deliveryStatus: z.string().optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { store } = ctx;
      const { startDate, endDate, deliveryStatus, search, page, limit } = input;

      // Step 1: Store authentication
      if (!store) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Store authentication required",
        });
      }

      const Order = await getOrderModel();
      const skip = (page - 1) * limit;

      // Step 2: Build MongoDB match conditions for filtering
      const matchConditions: any = {
        stores: new mongoose.Types.ObjectId(store.id),
      };

      // Step 3: Date range filtering
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);

        if (start > end) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Start date must be before end date",
          });
        }

        matchConditions.createdAt = { $gte: start, $lte: end };
      }

      // Step 4: Delivery status filtering
      if (deliveryStatus && deliveryStatus !== "all") {
        matchConditions["subOrders.deliveryStatus"] = deliveryStatus;
      }

      // Step 5: Search filtering
      if (search && search.trim()) {
        const searchRegex = new RegExp(search.trim(), "i");
        matchConditions.$or = [
          { _id: { $regex: searchRegex } },
          { "user.name": { $regex: searchRegex } },
          { "user.email": { $regex: searchRegex } },
          { "subOrders.products.Product.name": { $regex: searchRegex } },
        ];
      }

      try {
        // Step 6: Execute parallel DB queries (main query + count)
        const [orders, totalCount] = await Promise.all([
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
            .lean(),

          Order.countDocuments(matchConditions),
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        return {
          success: true,
          orders,
          pagination: {
            currentPage: page,
            totalPages,
            totalCount,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            limit,
          },
          filters: {
            dateRange: startDate && endDate ? { startDate, endDate } : null,
            deliveryStatus: deliveryStatus || "all",
            searchQuery: search || "",
          },
        };
      } catch (error) {
        console.error("Store orders fetch error:", error);

        if (error instanceof mongoose.Error.ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid query parameters",
          });
        }

        if (error instanceof mongoose.Error.CastError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid data format in query",
          });
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch orders. Please try again later.",
        });
      }
    }),
});
