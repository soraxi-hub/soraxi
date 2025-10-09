import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getOrderModel } from "@/lib/db/models/order.model";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import {
  logAdminAction,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
} from "@/modules/admin/security/audit-logger";
import type { Role } from "@/modules/admin/security/roles";
import { GetRefundItemDetailOutputSchema } from "@/types/admin-refund-types";

export const adminRefundDetailRouter = createTRPCRouter({
  /**
   * Get Refund Queue Item Detail Procedure
   *
   * Provides detailed information about a specific sub-order in the refund queue.
   * This includes complete order context, customer information, store details,
   * product information, and escrow status.
   *
   * Features:
   * - Complete sub-order details with full context
   * - Customer and store information
   * - Product details with images and specifications
   * - Escrow status and financial information
   * - Order timeline and status history
   * - Audit logging for admin actions
   *
   * Security:
   * - Admin authentication and authorization
   * - Sub-order ID validation
   * - Error handling and logging
   */
  getRefundItemDetail: baseProcedure
    .input(
      z.object({
        subOrderId: z.string().min(1, "Sub-order ID is required"),
      })
    )
    .output(GetRefundItemDetailOutputSchema) // Apply the Zod schema for output inference
    .query(async ({ input, ctx }) => {
      try {
        // ==================== Authentication & Authorization ====================

        /**
         * Admin Authentication Check
         *
         * Verifies that the request is coming from an authenticated admin user
         * with appropriate permissions to view refund queue details.
         */
        if (!ctx.admin) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Admin authentication required",
          });
        }

        // ==================== Parameter Validation ====================

        /**
         * Validate Sub-Order ID
         *
         * Ensures the provided sub-order ID is a valid MongoDB ObjectId.
         */
        if (!mongoose.Types.ObjectId.isValid(input.subOrderId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The provided sub-order ID is invalid",
          });
        }

        // ==================== Database Query ====================

        /**
         * Find Order with Specific Sub-Order
         *
         * Uses aggregation to find the order containing the specified sub-order
         * and populate all related data for detailed display.
         */
        const Order = await getOrderModel();

        const pipeline = [
          // Match orders that contain the specific sub-order
          {
            $match: {
              "subOrders._id": new mongoose.Types.ObjectId(input.subOrderId),
            },
          },

          // Populate user data
          {
            $lookup: {
              from: "users",
              localField: "userId",
              foreignField: "_id",
              as: "userData",
            },
          },

          // Unwind sub-orders to work with individual sub-orders
          { $unwind: "$subOrders" },

          // Match the specific sub-order
          {
            $match: {
              "subOrders._id": new mongoose.Types.ObjectId(input.subOrderId),
            },
          },

          // Verify this sub-order is in the refund queue
          {
            $match: {
              "subOrders.deliveryStatus": {
                $in: ["Canceled", "Returned", "Failed Delivery"],
              },
              "subOrders.escrow.held": true,
              "subOrders.escrow.released": false,
              "subOrders.escrow.refunded": false,
            },
          },

          // Populate store data for the sub-order
          {
            $lookup: {
              from: "stores",
              localField: "subOrders.storeId",
              foreignField: "_id",
              as: "subOrders.storeData",
            },
          },

          // Populate product data for the sub-order
          {
            $lookup: {
              from: "products",
              localField: "subOrders.products.productId",
              foreignField: "_id",
              as: "subOrders.productData",
            },
          },

          // Project the fields we need
          {
            $project: {
              _id: 1,
              orderNumber: {
                $concat: ["ORD-", { $substr: [{ $toString: "$_id" }, 0, 8] }],
              },
              createdAt: 1,
              updatedAt: 1,
              totalAmount: 1,
              shippingAddress: 1,
              paymentMethod: 1,
              paymentStatus: 1,
              notes: 1,
              discount: 1,
              taxAmount: 1,
              customer: {
                id: { $arrayElemAt: ["$userData._id", 0] },
                name: {
                  $concat: [
                    { $arrayElemAt: ["$userData.firstName", 0] },
                    " ",
                    { $arrayElemAt: ["$userData.lastName", 0] },
                  ],
                },
                email: { $arrayElemAt: ["$userData.email", 0] },
                phone: { $arrayElemAt: ["$userData.phoneNumber", 0] },
                address: { $arrayElemAt: ["$userData.address", 0] },
              },
              subOrder: {
                id: "$subOrders._id",
                store: {
                  id: { $arrayElemAt: ["$subOrders.storeData._id", 0] },
                  name: { $arrayElemAt: ["$subOrders.storeData.name", 0] },
                  email: {
                    $arrayElemAt: ["$subOrders.storeData.storeEmail", 0],
                  },
                  description: {
                    $arrayElemAt: ["$subOrders.storeData.description", 0],
                  },
                },
                products: {
                  $map: {
                    input: "$subOrders.products",
                    as: "product",
                    in: {
                      Product: "$$product.Product",
                      quantity: "$$product.quantity",
                      price: "$$product.price",
                      selectedSize: "$$product.selectedSize",
                      productData: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: "$subOrders.productData",
                              cond: {
                                $eq: ["$$this._id", "$$product.Product"],
                              },
                            },
                          },
                          0,
                        ],
                      },
                    },
                  },
                },
                totalAmount: "$subOrders.totalAmount",
                deliveryStatus: "$subOrders.deliveryStatus",
                escrow: "$subOrders.escrow",
                shippingMethod: "$subOrders.shippingMethod",
                deliveryDate: "$subOrders.deliveryDate",
                customerConfirmedDelivery:
                  "$subOrders.customerConfirmedDelivery",
                returnWindow: "$subOrders.returnWindow",
              },
            },
          },
        ];

        const result = await Order.aggregate(pipeline);

        if (!result || result.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "The specified sub-order was not found in the refund queue",
          });
        }

        const orderData = result[0];

        // ==================== Response Formatting ====================

        /**
         * Format Detailed Sub-Order Information
         *
         * Transforms the aggregation result into a properly formatted
         * response with complete sub-order details.
         */
        const formattedResponse = {
          id: orderData._id.toString(),
          orderNumber: orderData.orderNumber,
          subOrderId: orderData.subOrder.id.toString(),

          // Customer information
          customer: {
            id: orderData.customer.id?.toString() || "",
            name: orderData.customer.name || "Unknown Customer",
            email: orderData.customer.email || "",
            phone: orderData.customer.phone || "",
            address: orderData.customer.address || "",
          },

          // Store information
          store: {
            id: orderData.subOrder.store.id?.toString() || "",
            name: orderData.subOrder.store.name || "Unknown Store",
            email: orderData.subOrder.store.email || "",
            description: orderData.subOrder.store.description || "",
          },

          // Product information with details
          products: orderData.subOrder.products.map((product: any) => ({
            id: product.Product?.toString() || "",
            name: product.productData?.name || "Unknown Product",
            images: product.productData?.images || [],
            price: product.price,
            quantity: product.quantity,
            selectedSize: product.selectedSize,
            category: product.productData?.category || [],
            subCategory: product.productData?.subCategory || [],
            productType: product.productData?.productType || "",
            totalPrice: product.price * product.quantity,
          })),

          // Financial information
          subOrderAmount: orderData.subOrder.totalAmount,
          orderTotalAmount: orderData.totalAmount,
          discount: orderData.discount || 0,
          taxAmount: orderData.taxAmount || 0,

          // Status and delivery information
          deliveryStatus: orderData.subOrder.deliveryStatus,
          deliveryDate: orderData.subOrder.deliveryDate,
          customerConfirmedDelivery:
            orderData.subOrder.customerConfirmedDelivery,
          returnWindow: orderData.subOrder.returnWindow,

          // Escrow information
          escrow: {
            held: orderData.subOrder.escrow.held,
            released: orderData.subOrder.escrow.released,
            releasedAt: orderData.subOrder.escrow.releasedAt,
            refunded: orderData.subOrder.escrow.refunded,
            refundReason: orderData.subOrder.escrow.refundReason,
          },

          // Shipping information
          shippingMethod: orderData.subOrder.shippingMethod,
          shippingAddress: orderData.shippingAddress,

          // Payment information
          paymentMethod: orderData.paymentMethod,
          paymentStatus: orderData.paymentStatus,

          // Order metadata
          notes: orderData.notes,
          createdAt: orderData.createdAt.toISOString(),
          updatedAt: orderData.updatedAt.toISOString(),
          refundRequestDate: orderData.updatedAt.toISOString(),
        };

        // ==================== Audit Logging ====================

        /**
         * Log Admin Action
         *
         * Records the admin's detailed view action for audit purposes.
         */
        await logAdminAction({
          adminId: ctx.admin.id,
          adminName: ctx.admin.name,
          adminEmail: ctx.admin.email,
          adminRoles: ctx.admin.roles as Role[],
          action: AUDIT_ACTIONS.REFUND_DETAIL_VIEWED,
          module: AUDIT_MODULES.REFUNDS,
          details: {
            subOrderId: input.subOrderId,
            orderId: orderData._id.toString(),
            orderNumber: orderData.orderNumber,
            refundAmount: orderData.subOrder.totalAmount,
            deliveryStatus: orderData.subOrder.deliveryStatus,
          },
        });

        // ==================== Response ====================

        return {
          success: true,
          refundItem: formattedResponse,
        };
      } catch (error) {
        // ==================== Error Handling ====================

        /**
         * Comprehensive Error Handling
         *
         * Logs errors for debugging while providing user-friendly error messages.
         */
        console.error("Admin refund queue detail fetch error:", error);

        // Handle specific error types
        if (error instanceof mongoose.Error.CastError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "The provided sub-order ID is invalid",
          });
        }

        if (error instanceof TRPCError) {
          throw error;
        }

        // Generic error response
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Failed to fetch refund queue item details. Please try again later.",
        });
      }
    }),
});
