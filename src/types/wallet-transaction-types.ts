import type mongoose from "mongoose";
import type { IWalletTransaction } from "@/lib/db/models/wallet.model";

/**
 * Interface for wallet transaction query parameters
 *
 * Defines the structure of filtering and pagination parameters
 * used when retrieving wallet transactions for a store.
 */
export interface WalletTransactionQueryParams {
  /**
   * Page number for pagination (minimum: 1)
   */
  page: number;

  /**
   * Number of items per page (minimum: 1, maximum: 50)
   */
  limit: number;

  /**
   * Filter by transaction type
   */
  type?: "credit" | "debit";

  /**
   * Filter by transaction source
   */
  source?: "order" | "withdrawal" | "refund" | "adjustment";

  /**
   * Filter by date range in days (e.g., 7, 30, 90, 365)
   */
  days?: number;

  /**
   * Search term for filtering by description or source
   */
  search?: string;
}

/**
 * Interface for creating a new wallet transaction
 *
 * Defines the required and optional fields when creating
 * a new wallet transaction through the API.
 */
export interface CreateWalletTransactionInput {
  /**
   * Transaction type - credit adds to balance, debit subtracts
   */
  type: "credit" | "debit";

  /**
   * Transaction amount in kobo (must be positive)
   */
  amount: number;

  /**
   * Source of the transaction for categorization
   */
  source: "order" | "withdrawal" | "refund" | "adjustment";

  /**
   * Optional description providing context for the transaction
   */
  description?: string;

  /**
   * Optional reference to related order (for order-based transactions)
   */
  relatedOrderId?: string;
}

/**
 * Interface for populated related order data in transactions
 *
 * Represents the essential order information that gets populated
 * when retrieving wallet transactions with order context.
 */
export interface PopulatedRelatedOrder {
  _id: string;
  totalAmount: number;
  createdAt: Date;
}

/**
 * Interface for formatted wallet transaction response
 *
 * Defines the structure of wallet transaction data returned to clients
 * with all necessary information for display and processing.
 */
export interface FormattedWalletTransaction {
  _id: string;
  wallet: string;
  type: "credit" | "debit";
  amount: number;
  source: "order" | "withdrawal" | "refund" | "adjustment";
  description: string | null;
  relatedOrderId: string | null;
  relatedOrder: PopulatedRelatedOrder | null;
  createdAt: Date;
}

/**
 * Interface for wallet transaction aggregation result
 *
 * Represents the shape of documents returned by the MongoDB aggregation
 * pipeline when querying wallet transactions with populated order data.
 */
export interface WalletTransactionAggregationResult
  extends Omit<IWalletTransaction, "relatedOrderId"> {
  /**
   * Populated related order data (single object due to $arrayElemAt)
   *
   * The $lookup stage populates order data, and $arrayElemAt extracts
   * the first element from the resulting array for easier access.
   */
  relatedOrder: PopulatedRelatedOrder | null;

  /**
   * Original related order ID (preserved for reference)
   */
  relatedOrderId?: mongoose.Types.ObjectId;
}

/**
 * Interface for pagination metadata
 *
 * Provides comprehensive pagination information for client-side
 * navigation and display of transaction lists.
 */
export interface PaginationMetadata {
  currentPage: number;
  totalPages: number;
  totalTransactions: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Interface for wallet transactions list response
 *
 * Defines the complete response structure when retrieving
 * a paginated list of wallet transactions.
 */
export interface WalletTransactionsResponse {
  success: true;
  transactions: FormattedWalletTransaction[];
  pagination: PaginationMetadata;
}

/**
 * Interface for create wallet transaction response
 *
 * Defines the response structure when successfully creating
 * a new wallet transaction.
 */
export interface CreateWalletTransactionResponse {
  success: true;
  message: string;
  transaction: FormattedWalletTransaction;
}
