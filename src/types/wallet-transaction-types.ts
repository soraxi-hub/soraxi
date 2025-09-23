import type mongoose from "mongoose";
import type {
  IWalletTransaction,
  WalletTransactionRelatedDocumentType,
  WalletTransactionSource,
  WalletTransactionType,
} from "@/lib/db/models/wallet.model";

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
  type?: WalletTransactionType;

  /**
   * Filter by transaction source
   */
  source?: WalletTransactionSource;

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
  type: WalletTransactionType;

  /**
   * Transaction amount in kobo (must be positive)
   */
  amount: number;

  /**
   * Source of the transaction for categorization
   */
  source: WalletTransactionSource;

  /**
   * Optional description providing context for the transaction
   */
  description?: string;

  /**
   * Optional reference to a related document (e.g., Order, WithdrawalRequest)
   * This field will store the ObjectId of the related document.
   */
  relatedDocumentId?: string; // Changed from relatedOrderId

  /**
   * Optional type of the related document (e.g., "Order", "WithdrawalRequest")
   * This helps in dynamically populating or linking to the correct detail page.
   */
  relatedDocumentType?: WalletTransactionRelatedDocumentType; // New field
}

/**
 * Interface for populated related Order data in transactions
 *
 * Interface for populated related order data in transactions
 * Represents the essential order information that gets populated
 * when retrieving wallet transactions with order context.
 */
export interface PopulatedOrderForTransaction {
  _id: string;
  totalAmount: number;
  createdAt: Date;
  orderNumber: string; // Assuming orders have an orderNumber
}

/**
 * Interface for populated related WithdrawalRequest data in transactions
 */
export interface PopulatedWithdrawalRequestForTransaction {
  _id: string;
  requestedAmount: number;
  netAmount: number;
  status: string;
  requestNumber: string; // Assuming withdrawal requests have a requestNumber
  createdAt: Date;
}

/**
 * Union type for any populated related document.
 * This allows for type-safe access to specific fields based on the document type.
 */
export type PopulatedRelatedDocument =
  | PopulatedOrderForTransaction
  | PopulatedWithdrawalRequestForTransaction;

/**
 * Interface for formatted wallet transaction response
 *
 * Defines the structure of wallet transaction data returned to clients
 * with all necessary information for display and processing.
 */
export interface FormattedWalletTransaction {
  _id: string;
  walletId: string;
  type: WalletTransactionType;
  amount: number;
  source: WalletTransactionSource;
  description: string | null;
  relatedDocumentId: string | null; // Changed from relatedOrderId
  relatedDocumentType: WalletTransactionRelatedDocumentType | null; // New field
  relatedDocument: PopulatedRelatedDocument | null; // Changed from relatedOrder
  createdAt: Date;
}

/**
 * Interface for wallet transaction aggregation result
 *
 * Represents the shape of documents returned by the MongoDB aggregation
 * pipeline when querying wallet transactions with populated document data.
 *
 * NOTE: The underlying Mongoose model (IWalletTransaction in wallet.model.ts)
 * must also be updated to include `relatedDocumentId` and `relatedDocumentType`
 * fields for this to work correctly.
 */
export interface WalletTransactionAggregationResult
  extends Omit<IWalletTransaction, "relatedDocumentId"> {
  /**
   * Populated related document data (single object due to $arrayElemAt)
   *
   * The $lookup stage populates document data, and $arrayElemAt extracts
   * the first element from the resulting array for easier access.
   */
  relatedDocument: PopulatedRelatedDocument | null; // Changed from relatedOrder

  /**
   * Original related document ID (preserved for reference)
   */
  relatedDocumentId?: mongoose.Types.ObjectId; // Changed from relatedOrderId
  relatedDocumentType?: WalletTransactionRelatedDocumentType; // New field
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
