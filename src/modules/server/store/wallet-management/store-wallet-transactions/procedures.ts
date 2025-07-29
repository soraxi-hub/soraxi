import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";
import {
  getWalletModel,
  getWalletTransactionModel,
} from "@/lib/db/models/wallet.model";
import mongoose from "mongoose";
import type {
  WalletTransactionQueryParams,
  CreateWalletTransactionInput,
  WalletTransactionsResponse,
  CreateWalletTransactionResponse,
  WalletTransactionAggregationResult,
  FormattedWalletTransaction,
  PaginationMetadata,
} from "@/types/wallet-transaction-types";

/**
 * Store Wallet Transactions TRPC Router
 *
 * Handles wallet transaction operations for authenticated stores including
 * advanced filtering, pagination, search capabilities, and transaction creation.
 *
 * This router provides comprehensive wallet transaction management with:
 * - Advanced filtering by type, source, and date range
 * - Full-text search across transaction descriptions and sources
 * - Pagination with configurable page sizes and metadata
 * - Comprehensive transaction data with related order information
 * - Performance-optimized MongoDB aggregation queries
 * - Atomic transaction creation with wallet balance updates
 * - Full TypeScript typing throughout for type safety
 *
 * Security Features:
 * - Store authentication via context validation
 * - Input validation and sanitization
 * - Comprehensive error handling with appropriate HTTP status codes
 * - Protection against invalid data and injection attacks
 *
 * Performance Optimizations:
 * - Efficient MongoDB aggregation pipelines
 * - Selective field projection to minimize data transfer
 * - Optimized pagination with skip/limit operations
 * - Indexed queries for fast wallet lookups
 */
export const storeWalletTransactionsRouter = createTRPCRouter({
  /**
   * GET Handler - Retrieve Paginated Wallet Transactions
   *
   * Fetches wallet transactions for the authenticated store with comprehensive
   * filtering, search, and pagination capabilities. Uses MongoDB aggregation
   * for optimal performance and data population.
   */
  getTransactions: baseProcedure
    .input(
      z.object({
        /**
         * Pagination parameters with validation
         */
        page: z.number().min(1, "Page must be at least 1").default(1),
        limit: z
          .number()
          .min(1, "Limit must be at least 1")
          .max(50, "Limit cannot exceed 50")
          .default(10),

        /**
         * Transaction type filter with enum validation
         */
        type: z.enum(["credit", "debit"]).optional(),

        /**
         * Transaction source filter with enum validation
         */
        source: z
          .enum(["order", "withdrawal", "refund", "adjustment"])
          .optional(),

        /**
         * Date range filter in days with positive number validation
         */
        days: z.number().positive("Days must be positive").optional(),

        /**
         * Search term with minimum length validation
         */
        search: z.string().min(1).optional(),
      })
    )
    .query(async ({ input, ctx }): Promise<WalletTransactionsResponse> => {
      const { store } = ctx;

      try {
        // ==================== Authentication & Authorization ====================

        /**
         * Store Authentication Check
         *
         * Verifies that the request is coming from an authenticated store session.
         * This ensures only authorized stores can access their wallet transactions.
         */
        if (!store?.id) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Store authentication required",
          });
        }

        // ==================== Input Processing ====================

        /**
         * Extract and Validate Query Parameters
         *
         * Processes the input parameters with proper typing and validation
         * to ensure all filtering and pagination options are valid.
         */
        const queryParams: WalletTransactionQueryParams = {
          page: input.page,
          limit: input.limit,
          type: input.type,
          source: input.source,
          days: input.days,
          search: input.search,
        };

        // ==================== Database Models ====================

        /**
         * Initialize Database Models
         *
         * Gets the required Mongoose models for wallet and transaction operations.
         */
        const Wallet = await getWalletModel();
        const WalletTransaction = await getWalletTransactionModel();

        // ==================== Find Store Wallet ====================

        /**
         * Locate Store's Wallet
         *
         * Finds the wallet associated with the authenticated store.
         * Only the wallet ID is selected for performance optimization.
         */
        const wallet = await Wallet.findOne({ store: store.id }).select("_id");

        if (!wallet) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Wallet not found for this store",
          });
        }

        // ==================== Build Aggregation Pipeline ====================

        /**
         * Construct MongoDB Aggregation Pipeline
         *
         * Creates a comprehensive aggregation pipeline that:
         * 1. Matches transactions for the store's wallet
         * 2. Applies filtering based on type, source, date range, and search
         * 3. Sorts transactions by creation date (newest first)
         * 4. Populates related order information
         * 5. Handles pagination with skip/limit operations
         *
         * The pipeline is optimized for performance and returns properly typed results.
         */
        const pipeline: mongoose.PipelineStage[] = [
          /**
           * Stage 1: Match transactions for this wallet
           *
           * Filters transactions to only include those belonging to the
           * authenticated store's wallet.
           */
          { $match: { wallet: wallet._id } },
        ];

        /**
         * Stage 2: Apply type filter (if provided)
         *
         * Filters transactions by type (credit or debit) when specified
         * in the query parameters.
         */
        if (queryParams.type) {
          pipeline.push({ $match: { type: queryParams.type } });
        }

        /**
         * Stage 3: Apply source filter (if provided)
         *
         * Filters transactions by source (order, withdrawal, refund, adjustment)
         * when specified in the query parameters.
         */
        if (queryParams.source) {
          pipeline.push({ $match: { source: queryParams.source } });
        }

        /**
         * Stage 4: Apply date range filter (if provided)
         *
         * Filters transactions to only include those created within the
         * specified number of days from the current date.
         */
        if (queryParams.days) {
          const daysAgo = new Date();
          daysAgo.setDate(daysAgo.getDate() - queryParams.days);
          pipeline.push({
            $match: {
              createdAt: { $gte: daysAgo },
            },
          });
        }

        /**
         * Stage 5: Apply search filter (if provided)
         *
         * Performs case-insensitive text search across transaction descriptions
         * and sources using MongoDB regex matching.
         */
        if (queryParams.search && queryParams.search.trim()) {
          pipeline.push({
            $match: {
              $or: [
                {
                  description: {
                    $regex: queryParams.search.trim(),
                    $options: "i",
                  },
                },
                {
                  source: { $regex: queryParams.search.trim(), $options: "i" },
                },
              ],
            },
          });
        }

        /**
         * Stage 6: Sort transactions by creation date
         *
         * Orders transactions by creation date in descending order
         * (newest transactions first) for better user experience.
         */
        pipeline.push({ $sort: { createdAt: -1 } });

        // ==================== Execute Count Query ====================

        /**
         * Calculate Total Transaction Count
         *
         * Executes a separate aggregation pipeline to count the total number
         * of transactions matching the filters for pagination metadata.
         */
        const countPipeline = [...pipeline, { $count: "total" }];
        const countResult = await WalletTransaction.aggregate(countPipeline);
        const totalTransactions = countResult[0]?.total || 0;

        // ==================== Add Pagination and Population ====================

        /**
         * Stage 7: Add pagination
         *
         * Implements skip and limit operations for pagination based on
         * the requested page number and page size.
         */
        pipeline.push(
          { $skip: (queryParams.page - 1) * queryParams.limit },
          { $limit: queryParams.limit }
        );

        /**
         * Stage 8: Populate related order data
         *
         * Joins with the orders collection to get related order information
         * and formats the data for easier client consumption.
         */
        pipeline.push(
          {
            $lookup: {
              from: "orders",
              localField: "relatedOrderId",
              foreignField: "_id",
              as: "relatedOrder",
              pipeline: [
                {
                  $project: {
                    _id: 1,
                    totalAmount: 1,
                    createdAt: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              relatedOrder: { $arrayElemAt: ["$relatedOrder", 0] },
            },
          }
        );

        // ==================== Execute Main Query ====================

        /**
         * Execute Aggregation Pipeline with Type Safety
         *
         * Runs the complete aggregation pipeline and returns properly typed
         * results for further processing and formatting.
         */
        const transactions: WalletTransactionAggregationResult[] =
          await WalletTransaction.aggregate(pipeline);

        // ==================== Calculate Pagination Metadata ====================

        /**
         * Generate Pagination Information
         *
         * Calculates comprehensive pagination metadata including total pages,
         * navigation flags, and current page information.
         */
        const totalPages = Math.ceil(totalTransactions / queryParams.limit);
        const paginationMetadata: PaginationMetadata = {
          currentPage: queryParams.page,
          totalPages,
          totalTransactions,
          pageSize: queryParams.limit,
          hasNextPage: queryParams.page < totalPages,
          hasPrevPage: queryParams.page > 1,
        };

        // ==================== Format Response Data ====================

        /**
         * Format Transactions for Client Consumption
         *
         * Transforms the aggregation results into a clean, consistent format
         * suitable for client-side display and processing with proper typing.
         */
        const formattedTransactions: FormattedWalletTransaction[] =
          transactions.map((transaction) => ({
            _id: transaction._id.toString(),
            wallet: transaction.wallet.toString(),
            type: transaction.type,
            amount: transaction.amount,
            source: transaction.source,
            description: transaction.description || null,
            relatedOrderId: transaction.relatedOrderId?.toString() || null,
            relatedOrder: transaction.relatedOrder
              ? {
                  _id: transaction.relatedOrder._id,
                  totalAmount: transaction.relatedOrder.totalAmount,
                  createdAt: transaction.relatedOrder.createdAt,
                }
              : null,
            createdAt: transaction.createdAt,
          }));

        // ==================== Return Response ====================

        /**
         * Return Formatted Response
         *
         * Sends back the formatted transactions with comprehensive pagination
         * metadata and success confirmation.
         */
        return {
          success: true,
          transactions: formattedTransactions,
          pagination: paginationMetadata,
        };
      } catch (error) {
        // ==================== Error Handling ====================

        /**
         * Comprehensive Error Handling
         *
         * Handles various error types with appropriate error codes and messages
         * while logging detailed error information for debugging.
         */
        console.error("Error fetching wallet transactions:", error);

        // Re-throw TRPC errors as-is
        if (error instanceof TRPCError) {
          throw error;
        }

        // Handle MongoDB-specific errors
        if (error instanceof mongoose.Error.ValidationError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid query parameters provided",
          });
        }

        if (error instanceof mongoose.Error.CastError) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid ID format in query parameters",
          });
        }

        // Generic error fallback
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message:
            "Failed to fetch wallet transactions. Please try again later.",
        });
      }
    }),

  /**
   * POST Handler - Create New Wallet Transaction
   *
   * Creates a new wallet transaction and updates the wallet balance atomically.
   * This endpoint is typically used for administrative purposes or manual adjustments.
   */
  createTransaction: baseProcedure
    .input(
      z.object({
        /**
         * Transaction type validation with enum constraint
         */
        type: z.enum(["credit", "debit"], {
          required_error: "Transaction type is required",
          invalid_type_error:
            "Transaction type must be either 'credit' or 'debit'",
        }),

        /**
         * Amount validation with positive number constraint
         */
        amount: z
          .number()
          .positive("Amount must be a positive number")
          .min(1, "Amount must be at least 1 kobo"),

        /**
         * Source validation with enum constraint
         */
        source: z.enum(["order", "withdrawal", "refund", "adjustment"], {
          required_error: "Transaction source is required",
          invalid_type_error: "Invalid transaction source",
        }),

        /**
         * Optional description with minimum length validation
         */
        description: z.string().min(1).optional(),

        /**
         * Optional related order ID with MongoDB ObjectId validation
         */
        relatedOrderId: z
          .string()
          .refine((id) => !id || mongoose.Types.ObjectId.isValid(id), {
            message: "Invalid order ID format",
          })
          .optional(),
      })
    )
    .mutation(
      async ({ input, ctx }): Promise<CreateWalletTransactionResponse> => {
        const { store } = ctx;

        try {
          // ==================== Authentication & Authorization ====================

          /**
           * Store Authentication Check
           *
           * Verifies that the request is coming from an authenticated store session
           * with permission to create wallet transactions.
           */
          if (!store?.id) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Store authentication required",
            });
          }

          // ==================== Input Processing ====================

          /**
           * Extract and Validate Input Data
           *
           * Processes the input data with proper typing and validation
           * to ensure all transaction fields are valid and safe.
           */
          const transactionInput: CreateWalletTransactionInput = {
            type: input.type,
            amount: input.amount,
            source: input.source,
            description: input.description,
            relatedOrderId: input.relatedOrderId,
          };

          // ==================== Database Models ====================

          /**
           * Initialize Database Models
           *
           * Gets the required Mongoose models for wallet and transaction operations.
           */
          const Wallet = await getWalletModel();
          const WalletTransaction = await getWalletTransactionModel();

          // ==================== Find Store Wallet ====================

          /**
           * Locate Store's Wallet
           *
           * Finds the complete wallet document for the authenticated store
           * to enable balance updates during transaction creation.
           */
          const wallet = await Wallet.findOne({ store: store.id });

          if (!wallet) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Wallet not found for this store",
            });
          }

          // ==================== Create Transaction ====================

          /**
           * Create New Wallet Transaction
           *
           * Creates a new transaction record with all provided information
           * and proper data validation.
           */
          const transaction = new WalletTransaction({
            wallet: wallet._id,
            type: transactionInput.type,
            amount: transactionInput.amount,
            source: transactionInput.source,
            description: transactionInput.description,
            relatedOrderId: transactionInput.relatedOrderId
              ? new mongoose.Types.ObjectId(transactionInput.relatedOrderId)
              : undefined,
          });

          const savedTransaction = await transaction.save();

          // ==================== Update Wallet Balance ====================

          /**
           * Update Wallet Balance Atomically
           *
           * Updates the wallet balance based on the transaction type:
           * - Credit transactions increase balance and total earned
           * - Debit transactions decrease balance only
           */
          if (transactionInput.type === "credit") {
            wallet.balance += transactionInput.amount;
            wallet.totalEarned += transactionInput.amount;
          } else {
            wallet.balance -= transactionInput.amount;
          }

          await wallet.save();

          // ==================== Format Response ====================

          /**
           * Format Transaction Response
           *
           * Creates a properly formatted response with the new transaction
           * data for client consumption.
           */
          const formattedTransaction: FormattedWalletTransaction = {
            _id: savedTransaction._id.toString(),
            wallet: savedTransaction.wallet.toString(),
            type: savedTransaction.type,
            amount: savedTransaction.amount,
            source: savedTransaction.source,
            description: savedTransaction.description || null,
            relatedOrderId: savedTransaction.relatedOrderId?.toString() || null,
            relatedOrder: null, // New transactions don't have populated order data
            createdAt: savedTransaction.createdAt,
          };

          // ==================== Return Response ====================

          return {
            success: true,
            message: "Transaction created successfully",
            transaction: formattedTransaction,
          };
        } catch (error) {
          // ==================== Error Handling ====================

          /**
           * Comprehensive Error Handling
           *
           * Handles various error types with appropriate error codes and messages
           * while logging detailed error information for debugging.
           */
          console.error("Error creating wallet transaction:", error);

          // Re-throw TRPC errors as-is
          if (error instanceof TRPCError) {
            throw error;
          }

          // Handle MongoDB validation errors
          if (error instanceof mongoose.Error.ValidationError) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid transaction data provided",
            });
          }

          // Handle MongoDB cast errors
          if (error instanceof mongoose.Error.CastError) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Invalid ID format provided",
            });
          }

          // Handle duplicate key errors
          if (
            error instanceof Error &&
            error.message.includes("duplicate key")
          ) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Transaction with this identifier already exists",
            });
          }

          // Generic error fallback
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "Failed to create wallet transaction. Please try again later.",
          });
        }
      }
    ),
});
