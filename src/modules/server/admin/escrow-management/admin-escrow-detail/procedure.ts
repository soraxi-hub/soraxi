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
import type {
  EscrowReleaseDetailAggregationResult,
  FormattedEscrowReleaseDetail,
} from "@/types/escrow-detail-aggregation";
import { currencyOperations } from "@/lib/utils/naira";

/**
 * Admin Escrow Release Detail TRPC Router
 *
 * Provides detailed information about a specific sub-order that is eligible
 * for escrow release, including complete order context and customer/store details.
 *
 * This procedure complements the escrow release queue by providing comprehensive
 * details needed for admin decision-making on individual escrow releases.
 *
 * Features:
 * - Complete sub-order details with full context
 * - Customer and store information with verification status
 * - Product details with images and specifications
 * - Escrow status and financial information
 * - Delivery confirmation details with timeline
 * - Return window information and eligibility verification
 * - Full TypeScript typing for all aggregation results
 *
 * Security:
 * - Admin authentication and authorization
 * - Input validation and sanitization
 * - Comprehensive error logging for monitoring
 * - Audit trail for all detail views
 *
 * Performance:
 * - Optimized MongoDB aggregation pipeline
 * - Selective field projection to minimize data transfer
 * - Single query with all necessary joins
 */
export const adminEscrowDetailRouter = createTRPCRouter({
  /**
   * GET Handler - Retrieve Detailed Escrow Release Information
   *
   * Fetches comprehensive details about a specific sub-order eligible for escrow release.
   * Uses MongoDB aggregation pipeline for optimal performance and complete data population.
   */
  getEscrowReleaseDetail: baseProcedure
    .input(
      z.object({
        /**
         * Sub-order ID parameter
         *
         * Must be a valid MongoDB ObjectId string representing the specific
         * sub-order for which detailed escrow release information is requested.
         */
        subOrderId: z.string().min(1, "Sub-order ID is required"),
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
         * with appropriate permissions to view detailed escrow data.
         */
        if (!admin || !checkAdminPermission(admin, [])) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Admin authentication required",
          });
        }

        // ==================== Parameter Validation ====================

        /**
         * Sub-Order ID Validation
         *
         * Validates the sub-order ID parameter to ensure it's a valid MongoDB ObjectId
         * before attempting database queries. This prevents unnecessary database calls
         * and potential injection attacks.
         */
        const { subOrderId } = input;

        if (!mongoose.Types.ObjectId.isValid(subOrderId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please provide a valid sub-order ID",
          });
        }

        // ==================== Database Query ====================

        /**
         * Fetch Sub-Order with Complete Context
         *
         * Uses MongoDB aggregation to find the specific sub-order and populate
         * all related data including order context, customer, store, and products.
         * The pipeline is designed to return exactly one result with comprehensive
         * information needed for escrow release decision-making.
         */
        const Order = await getOrderModel();

        /**
         * MongoDB Aggregation Pipeline for Escrow Release Detail
         *
         * This pipeline performs the following operations:
         * 1. Unwinds sub-orders to work with individual sub-orders
         * 2. Matches the specific sub-order by ID
         * 3. Verifies escrow release eligibility criteria
         * 4. Populates user data with essential customer information
         * 5. Populates store data with verification and business details
         * 6. Populates product data with comprehensive product information
         * 7. Adds computed fields for enhanced admin insights
         *
         * The result is typed as EscrowReleaseDetailAggregationResult for full type safety.
         */
        const pipeline: mongoose.PipelineStage[] = [
          /**
           * Stage 1: Unwind sub-orders
           *
           * Converts each order document with an array of sub-orders into
           * multiple documents, each containing one sub-order. This allows
           * us to match and process the specific sub-order.
           */
          { $unwind: "$subOrders" },

          /**
           * Stage 2: Match the specific sub-order
           *
           * Filters to find the exact sub-order requested by the admin.
           * Uses the provided subOrderId to locate the specific sub-order.
           */
          {
            $match: {
              "subOrders._id": new mongoose.Types.ObjectId(subOrderId),
            },
          },

          /**
           * Stage 3: Verify escrow release eligibility
           *
           * Ensures that only sub-orders eligible for escrow release are returned.
           * This acts as a security measure to prevent access to ineligible sub-orders.
           *
           * Eligibility criteria:
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
              "subOrders.returnWindow": { $lt: new Date() },
            },
          },

          /**
           * Stage 4: Populate user data
           *
           * Joins with the users collection to get comprehensive customer information.
           * Projects essential fields needed for admin review and decision-making.
           */
          {
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
          },

          /**
           * Stage 5: Populate store data
           *
           * Joins with the stores collection to get comprehensive store information.
           * Includes verification status and business information that's crucial
           * for escrow release decisions and risk assessment.
           */
          {
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
                    verification: 1,
                    businessInfo: 1,
                  },
                },
              ],
            },
          },

          /**
           * Stage 6: Populate product data
           *
           * Joins with the products collection to get detailed product information.
           * Includes category and product type data that helps admins understand
           * the nature of the items involved in the escrow release.
           */
          {
            $lookup: {
              from: "products",
              localField: "subOrders.products.Product",
              foreignField: "_id",
              as: "productDetails",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    name: 1,
                    images: 1,
                    price: 1,
                    category: 1,
                    subCategory: 1,
                    productType: 1,
                  },
                },
              ],
            },
          },

          /**
           * Stage 7: Add computed fields
           *
           * Transforms the populated arrays into single objects for easier access
           * and calculates the number of days since the return window expired.
           * This provides additional context for admin decision-making.
           */
          {
            $addFields: {
              userDetails: { $arrayElemAt: ["$userDetails", 0] },
              storeDetails: { $arrayElemAt: ["$storeDetails", 0] },
              daysSinceReturnWindow: {
                $divide: [
                  { $subtract: [new Date(), "$subOrders.returnWindow"] },
                  1000 * 60 * 60 * 24,
                ],
              },
            },
          },
        ];

        /**
         * Execute the aggregation pipeline with full type safety
         *
         * The results are properly typed as EscrowReleaseDetailAggregationResult[]
         * instead of any[], providing compile-time type checking and better
         * IntelliSense support for developers.
         */
        const results: EscrowReleaseDetailAggregationResult[] =
          await Order.aggregate(pipeline);

        /**
         * Validate query results
         *
         * Ensures that the sub-order exists and meets eligibility criteria.
         * If no results are found, it means either the sub-order doesn't exist
         * or it's not eligible for escrow release.
         */
        if (!results || results.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "The requested sub-order could not be found or is not eligible for escrow release",
          });
        }

        const result = results[0];

        // ==================== Data Formatting ====================

        /**
         * Format Sub-Order Data for Client
         *
         * Transforms the aggregation result into a properly formatted
         * object suitable for client consumption with full type safety.
         * The formatting ensures consistent data structure and handles
         * optional fields appropriately.
         */

        /**
         * Generate readable identifiers
         *
         * Creates human-readable order and sub-order numbers for better
         * admin user experience and easier reference in communications.
         */
        const orderNumber = `ORD-${(result._id as { toString(): string })
          .toString()
          .substring(0, 8)
          .toUpperCase()}`;
        const subOrderNumber = `SUB-${result.subOrders._id
          ?.toString()
          .substring(0, 8)
          .toUpperCase()}`;

        /**
         * Format customer information
         *
         * With proper typing, we can safely access userDetails properties
         * without worrying about undefined values or type mismatches.
         * Provides fallback values for missing data.
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
         * from the populated store data. Includes verification status
         * and business information crucial for escrow decisions.
         */
        const store = {
          id: result.storeDetails._id.toString(),
          name: result.storeDetails.name,
          email: result.storeDetails.storeEmail,
          logo: result.storeDetails.logoUrl || null,
          verification: {
            isVerified: result.storeDetails.verification?.isVerified || false,
            method: result.storeDetails.verification?.method || null,
            verifiedAt: result.storeDetails.verification?.verifiedAt || null,
          },
          businessInfo: {
            type: result.storeDetails.businessInfo?.type || "individual",
            businessName:
              result.storeDetails.businessInfo?.businessName || null,
            registrationNumber:
              result.storeDetails.businessInfo?.registrationNumber || null,
          },
        };

        /**
         * Format product information with comprehensive details
         *
         * Maps through the sub-order products and matches them with
         * the populated product details. Includes category information
         * and calculates total prices for better admin understanding.
         */
        const products = result.subOrders.products.map((product) => {
          const productDetail = result.productDetails.find(
            (p) => p._id.toString() === product.Product.toString()
          );
          return {
            id: product.Product.toString(),
            name: productDetail?.name || "Unknown Product",
            images: productDetail?.images || [],
            quantity: product.quantity,
            price: product.price,
            selectedSize: product.selectedSize || null,
            category: productDetail?.category || [],
            subCategory: productDetail?.subCategory || [],
            productType: productDetail?.productType || "Product",
            totalPrice: product.quantity * product.price,
          };
        });

        /**
         * Format escrow information
         *
         * Provides complete escrow status including release history,
         * refund information, and current amount held in escrow.
         */
        const escrowInfo = {
          held: result.subOrders.escrow.held,
          released: result.subOrders.escrow.released,
          releasedAt: result.subOrders.escrow.releasedAt || null,
          refunded: result.subOrders.escrow.refunded,
          refundReason: result.subOrders.escrow.refundReason || null,
          amount: currencyOperations.add(
            result.subOrders.totalAmount,
            result.subOrders.shippingMethod?.price ?? 0
          ),
        };

        /**
         * Format delivery information
         *
         * Includes comprehensive delivery status, customer confirmation details,
         * return window information, and shipping method details.
         * The computed daysSinceReturnWindow helps prioritize urgent releases.
         */
        const deliveryInfo = {
          status: result.subOrders.deliveryStatus,
          deliveredAt: result.subOrders.deliveryDate as Date,
          returnWindow: result.subOrders.returnWindow,
          daysSinceReturnWindow: Math.floor(result.daysSinceReturnWindow),
          customerConfirmation: {
            confirmed:
              result.subOrders.customerConfirmedDelivery?.confirmed || false,
            confirmedAt:
              result.subOrders.customerConfirmedDelivery?.confirmedAt || null,
            autoConfirmed:
              result.subOrders.customerConfirmedDelivery?.autoConfirmed ||
              false,
          },
          shippingMethod: result.subOrders.shippingMethod || null,
        };

        /**
         * Format order context
         *
         * Provides the broader order context including payment information,
         * shipping address, and order-level details that may be relevant
         * for escrow release decisions.
         */
        const orderContext = {
          id: (result._id as { toString(): string }).toString(),
          orderNumber,
          totalAmount: result.totalAmount,
          shippingAddress: result.shippingAddress,
          paymentMethod: result.paymentMethod || null,
          paymentStatus: result.paymentStatus || null,
          notes: result.notes || null,
          createdAt: result.createdAt.toISOString(),
          updatedAt: result.updatedAt.toISOString(),
        };

        /**
         * Create the final formatted response
         *
         * Combines all formatted data into a comprehensive sub-order detail
         * object with eligibility verification information.
         */
        const formattedSubOrder: FormattedEscrowReleaseDetail = {
          id: result.subOrders._id?.toString() || "",
          subOrderNumber,
          customer,
          store,
          products,
          escrowInfo,
          deliveryInfo,
          orderContext,
          eligibilityCheck: {
            isEligible: true,
            reasons: [
              "Delivery status is 'Delivered'",
              "Return window has passed",
              "Escrow is currently held",
              "Funds have not been released yet",
            ],
          },
        };

        // ==================== Audit Logging ====================

        /**
         * Log Admin Action
         *
         * Records the admin's detailed sub-order viewing action for audit purposes.
         * This maintains a complete audit trail of all admin activities related
         * to escrow management and helps with compliance and monitoring.
         */
        await logAdminAction({
          adminId: admin.id,
          adminName: admin.name,
          adminEmail: admin.email,
          adminRoles: admin.roles as Role[],
          action: AUDIT_ACTIONS.ORDER_VIEWED,
          module: AUDIT_MODULES.FINANCE,
          details: {
            viewType: "escrow_release_detail",
            subOrderId,
            subOrderNumber,
            orderNumber,
            escrowAmount: escrowInfo.amount,
            daysSinceReturnWindow: deliveryInfo.daysSinceReturnWindow,
            storeId: store.id,
            customerId: customer.id,
          },
        });

        // ==================== Response ====================

        /**
         * Return Formatted Response
         *
         * Sends back the comprehensive sub-order details with full type safety.
         * The response structure is consistent and well-documented for frontend consumption.
         */
        return {
          success: true,
          subOrder: formattedSubOrder,
        };
      } catch (error) {
        // ==================== Error Handling ====================

        /**
         * Comprehensive Error Handling
         *
         * Logs errors for debugging while providing user-friendly error messages.
         * Different error types are handled appropriately to provide meaningful
         * feedback to the client while maintaining security.
         */
        console.error("Admin escrow release detail fetch error:", error);

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
            message: "Please provide a valid sub-order ID",
          });
        }

        // Re-throw TRPC errors as-is (including our NOT_FOUND and UNAUTHORIZED errors)
        if (error instanceof TRPCError) {
          throw error;
        }

        // Generic error fallback
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch sub-order details. Please try again later.",
        });
      }
    }),
});
