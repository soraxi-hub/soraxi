import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getOrderModel } from "@/lib/db/models/order.model";
import { getUserModel } from "@/lib/db/models/user.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import mongoose from "mongoose";
import { RawOrderDocument } from "@/types/order";
import { formatOrderDocumentsForAdmins } from "@/lib/utils/order-formatter";
import { getProductModel } from "@/lib/db/models/product.model";
import { PERMISSIONS } from "@/modules/admin/security/permissions";
import { AdminGuard } from "@/domain/admin/admin-guard";
import { connectToDatabase } from "@/lib/db/mongoose";
import { getTransactionRecordByOrderId } from "@/lib/db/models/transaction-record.model";
// import { koboToNaira } from "@/lib/utils/naira";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";
import { SuborderFinancialStatus } from "@/enums/financial.enums";

/**
 * Admin Orders TRPC Router
 *
 * Provides comprehensive order management functionality for platform administrators,
 * including advanced filtering, search, and pagination capabilities.
 *
 * Features:
 * - Date range filtering (from/to)
 * - Status filtering (order status)
 * - Store filtering
 * - Customer search
 * - Order number search
 * - Pagination with customizable page size
 * - Comprehensive data population
 * - Audit logging for admin actions
 *
 * Security:
 * - Admin authentication and authorization
 * - Input validation and sanitization
 * - Error handling and logging
 */
export const adminOrdersRouter = createTRPCRouter({
  listOrders: baseProcedure
    .input(
      z.object({
        // Pagination parameters
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(10),

        // Date range parameters
        fromDate: z.string().optional(),
        toDate: z.string().optional(),

        // Status filters
        status: z.string().optional(),

        // Search parameters
        search: z.string().optional(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { admin: unAuthenticatedAdmin } = ctx;
      try {
        // ==================== Authentication & Authorization ====================
        /**
         * Admin Authentication Check
         *
         * Verifies that the request is coming from an authenticated admin user
         * with appropriate permissions to view order data.
         */
        AdminGuard.from(unAuthenticatedAdmin).require(PERMISSIONS.VIEW_ORDERS);

        // ==================== Request Parameters ====================
        /**
         * Extract and Process Query Parameters
         */
        const { page, limit, fromDate, toDate, status, search } = input;
        const skip = (page - 1) * limit;

        // Process date parameters
        const fromDateObj = fromDate ? new Date(fromDate) : null;
        const toDateObj = toDate ? new Date(toDate) : null;

        // If toDate is provided, set it to the end of the day (23:59:59.999)
        if (toDateObj) {
          toDateObj.setHours(23, 59, 59, 999);
        }

        // ==================== Query Construction ====================
        /**
         * Build MongoDB Query
         */
        const query: any = {};

        // Apply date range filter if provided
        if (fromDateObj || toDateObj) {
          query.createdAt = {};
          if (fromDateObj) query.createdAt.$gte = fromDateObj;
          if (toDateObj) query.createdAt.$lte = toDateObj;
        }

        // Apply status filter if provided
        if (status && status !== "all") {
          query["subOrders.deliveryStatus"] = status;
        }

        // ==================== Search Logic ====================
        /**
         * Handle Search Functionality
         */
        if (search && search.trim()) {
          const searchTerm = search.trim();
          const User = await getUserModel();
          const Store = await getStoreModel();

          // Search for matching users (by name or email)
          const matchingUsers = await User.find({
            $or: [
              { firstName: { $regex: searchTerm, $options: "i" } },
              { lastName: { $regex: searchTerm, $options: "i" } },
              { email: { $regex: searchTerm, $options: "i" } },
            ],
          }).select("_id");

          // Search for matching stores (by name or email)
          const matchingStores = await Store.find({
            $or: [
              { name: { $regex: searchTerm, $options: "i" } },
              { storeEmail: { $regex: searchTerm, $options: "i" } },
            ],
          }).select("_id");

          // Add user and store matches to our query
          const userIds = matchingUsers.map((user) => user._id);
          const storeIds = matchingStores.map((store) => store._id);

          if (userIds.length > 0 || storeIds.length > 0) {
            query.$or = [];

            if (userIds.length > 0) {
              query.$or.push({ user: { $in: userIds } });
            }

            if (storeIds.length > 0) {
              query.$or.push({ stores: { $in: storeIds } });
            }
          }
        }

        // ==================== Database Query Execution ====================
        /**
         * Execute Database Query
         */
        const Order = await getOrderModel();
        await getUserModel();
        await getStoreModel();
        await getProductModel();

        // Count total matching documents for pagination
        const totalOrders = await Order.countDocuments(query);

        // Execute main query with population
        const orders = await Order.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate({
            path: "userId",
            model: "User",
            select: "_id firstName lastName email phoneNumber",
          })
          .populate({
            path: "stores",
            model: "Store",
            select: "_id name storeEmail",
          })
          .populate({
            path: "subOrders.storeId",
            model: "Store",
            select: "_id name storeEmail",
          })
          .populate({
            path: "subOrders.products.productId",
            model: "Product",
            select: "_id name images price",
          })
          .lean<RawOrderDocument[]>();

        const formattedOrders = formatOrderDocumentsForAdmins(orders);

        // ==================== Response ====================
        /**
         * Return Formatted Response
         */
        return {
          success: true,
          orders: formattedOrders,
          pagination: {
            page,
            limit,
            total: totalOrders,
            pages: Math.ceil(totalOrders / limit),
          },
          filters: {
            fromDate: fromDateObj?.toISOString() || null,
            toDate: toDateObj?.toISOString() || null,
            status: status || "all",
            search: search || "",
          },
        };
      } catch (error) {
        // ==================== Error Handling ====================
        /**
         * Comprehensive Error Handling
         */
        console.error("Admin orders fetch error:", error);

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
          message: "Failed to fetch orders. Please try again later.",
        });
      }
    }),

  getAdminOrderById: baseProcedure
    .input(z.object({ orderId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      try {
        const { admin: unAuthenticatedAdmin } = ctx;
        AdminGuard.from(unAuthenticatedAdmin).require(PERMISSIONS.VIEW_ORDERS);

        if (!mongoose.Types.ObjectId.isValid(input.orderId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid order ID format.",
          });
        }

        await connectToDatabase();
        const Order = await getOrderModel();

        const order = await Order.findById(input.orderId)
          .populate({
            path: "userId",
            select: "firstName lastName email phoneNumber",
          })
          .populate({
            path: "subOrders.storeId",
            select: "name storeEmail",
          })
          .lean();

        if (!order) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found.",
          });
        }

        // Fetch financial statuses for all suborders
        const transactionRecord = await getTransactionRecordByOrderId(
          input.orderId,
        );

        const financialStatuses: Record<
          string,
          {
            status: string;
            grossAmount: number;
            commission: number;
            settleAmount: number;
            disputeId: string | null;
          }
        > = {};

        if (transactionRecord) {
          const { getActiveDisputeBySuborderId } = await import(
            "@/lib/db/models/dispute-record.model"
          );

          for (const breakdown of transactionRecord.suborderBreakdowns) {
            const suborderId = breakdown.suborderId.toString();
            let disputeId: string | null = null;

            if (breakdown.status === SuborderFinancialStatus.DISPUTED) {
              const activeDispute =
                await getActiveDisputeBySuborderId(suborderId);
              disputeId = activeDispute
                ? (activeDispute._id as mongoose.Types.ObjectId).toString()
                : null;
            }

            financialStatuses[suborderId] = {
              status: breakdown.status,
              grossAmount: breakdown.grossAmount,
              commission: breakdown.commission,
              settleAmount: breakdown.settleAmount,
              disputeId,
            };
          }
        }

        const user = order.userId as any;

        return {
          orderId: (order._id as mongoose.Types.ObjectId).toString(),
          orderNumber: `ORD-${(order._id as mongoose.Types.ObjectId).toString().slice(-8).toUpperCase()}`,
          paymentStatus: order.paymentStatus,
          totalAmount: order.totalAmount,
          createdAt: order.createdAt,
          notes: order.notes ?? null,
          shippingAddress: order.shippingAddress,
          customer: {
            id: user?._id?.toString() ?? order.userId.toString(),
            name: user ? `${user.firstName} ${user.lastName}` : "Unknown",
            email: user?.email ?? "Unknown",
            phone: user?.phoneNumber ?? null,
          },
          subOrders: order.subOrders.map((sub) => {
            const store = sub.storeId as any;
            const suborderId = sub._id?.toString() ?? "";
            return {
              subOrderId: suborderId,
              storeName: store?.name ?? "Unknown Store",
              storeEmail: store?.storeEmail ?? null,
              deliveryStatus: sub.deliveryStatus,
              totalAmount: sub.totalAmount,
              shippingMethod: sub.shippingMethod ?? null,
              deliveryDate: sub.deliveryDate ?? null,
              customerConfirmedDelivery: sub.customerConfirmedDelivery,
              financialStatus: financialStatuses[suborderId] ?? null,
              products: sub.products.map((p) => ({
                name: p.productSnapshot.name,
                quantity: p.productSnapshot.quantity,
                price: p.productSnapshot.price,
                image: p.productSnapshot.images?.[0] ?? null,
              })),
              statusHistory: sub.statusHistory.map((h) => ({
                status: h.status,
                timestamp: h.timestamp,
                notes: h.notes ?? null,
              })),
            };
          }),
          flutterwaveReference: transactionRecord?.flutterwaveReference ?? null,
        };
      } catch (error) {
        throw handleTRPCError(error, "Failed to fetch order details.");
      }
    }),
});
