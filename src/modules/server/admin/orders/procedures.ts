import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import { getOrderModel } from "@/lib/db/models/order.model";
import { getUserModel } from "@/lib/db/models/user.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { checkAdminPermission } from "@/modules/admin/security/access-control";
import {
  logAdminAction,
  AUDIT_ACTIONS,
  AUDIT_MODULES,
} from "@/modules/admin/security/audit-logger";
import mongoose from "mongoose";
import { Role } from "@/modules/admin/security/roles";
import { RawOrderDocument } from "@/types/order";
import { formatOrderDocumentsForAdmins } from "@/lib/utils/order-formatter";

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
         * with appropriate permissions to view order data.
         */
        if (!admin || !checkAdminPermission(admin, ["view_orders"])) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Unauthorized access",
          });
        }

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

        // Count total matching documents for pagination
        const totalOrders = await Order.countDocuments(query);

        // Execute main query with population
        const orders = await Order.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .populate({
            path: "user",
            model: "User",
            select: "_id firstName lastName email phoneNumber",
          })
          .populate({
            path: "stores",
            model: "Store",
            select: "_id name storeEmail",
          })
          .populate({
            path: "subOrders.store",
            model: "Store",
            select: "_id name storeEmail",
          })
          .populate({
            path: "subOrders.products.Product",
            model: "Product",
            select: "_id name images price",
          })
          .lean<RawOrderDocument[]>();

        const formattedOrders = formatOrderDocumentsForAdmins(orders);

        // ==================== Audit Logging ====================
        /**
         * Log Admin Action
         */
        await logAdminAction({
          adminId: admin.id,
          adminName: admin.name,
          adminEmail: admin.email,
          adminRoles: admin.roles as Role[],
          action: AUDIT_ACTIONS.ORDER_VIEWED,
          module: AUDIT_MODULES.ORDERS,
          details: {
            filters: {
              page,
              limit,
              fromDate: fromDateObj?.toISOString(),
              toDate: toDateObj?.toISOString(),
              status,
              search,
            },
            resultCount: formattedOrders.length,
          },
        });

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
});
