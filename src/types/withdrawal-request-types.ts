import type { IStore } from "@/lib/db/models/store.model";
import type { IAdmin } from "@/lib/db/models/admin.model"; // Assuming an Admin model exists
import { IWithdrawalRequest } from "@/lib/db/models/withdrawal-request.model";

/**
 * Interface for the input to create a withdrawal request (store-facing)
 */
export interface CreateWithdrawalRequestInput {
  amount: number; // Amount in kobo
  bankAccountId: string; // Account number of the selected payout account
  description?: string; // Optional description from the store
}

/**
 * Interface for the response after creating a withdrawal request
 */
export interface CreateWithdrawalRequestResponse {
  success: true;
  message: string;
  withdrawalRequest: {
    id: string;
    requestNumber: string;
    requestedAmount: number;
    netAmount: number;
    status:
      | "pending"
      | "under_review"
      | "approved"
      | "processing"
      | "completed"
      | "rejected"
      | "failed";
    createdAt: string;
  };
}

/**
 * Interface for populated store details in withdrawal request aggregation
 */
export type PopulatedStoreForWithdrawal = Pick<
  IStore,
  "_id" | "name" | "storeEmail" | "wallet" | "payoutAccounts"
>;

/**
 * Interface for populated admin details in withdrawal request aggregation
 */
export type PopulatedAdminForWithdrawal = Pick<
  IAdmin,
  "_id" | "name" | "email"
>;

/**
 * Interface for the aggregation result of a single withdrawal request detail
 */
export interface WithdrawalRequestDetailAggregationResult
  extends Omit<IWithdrawalRequest, "store" | "reviewedBy" | "processedBy"> {
  storeDetails: PopulatedStoreForWithdrawal;
  walletDetails?: {
    balance: number;
  };
  reviewedByAdmin?: PopulatedAdminForWithdrawal;
  processedByAdmin?: PopulatedAdminForWithdrawal;
}

/**
 * Interface for formatted single withdrawal request detail response (admin-facing)
 */
export interface FormattedWithdrawalRequestDetail {
  id: string;
  requestNumber: string;
  store: {
    id: string;
    name: string;
    email: string;
    walletBalance: number; // Current wallet balance of the store
  };
  requestedAmount: number;
  processingFee: number;
  netAmount: number;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountHolderName: string;
  };
  status:
    | "pending"
    | "under_review"
    | "approved"
    | "processing"
    | "completed"
    | "rejected"
    | "failed";
  statusHistory: Array<{
    status: string;
    timestamp: string;
    adminName?: string;
    notes?: string;
  }>;
  description?: string;
  review: {
    reviewedBy?: { id: string; name: string; email: string };
    reviewedAt?: string;
    notes?: string;
    rejectionReason?: string;
  };
  processing: {
    processedBy?: { id: string; name: string; email: string };
    processedAt?: string;
    transactionReference?: string;
  };
  createdAt: string;
  updatedAt: string;
}

/**
 * Interface for query parameters to list withdrawal requests (admin-facing)
 */
export interface GetWithdrawalRequestsInput {
  page: number;
  limit: number;
  status?:
    | "pending"
    | "under_review"
    | "approved"
    | "processing"
    | "completed"
    | "rejected"
    | "failed";
  storeId?: string;
  search?: string; // Search by request number, store name, account holder name
  fromDate?: string; // ISO string
  toDate?: string; // ISO string
}

/**
 * Interface for formatted list of withdrawal requests (admin-facing)
 */
export interface FormattedWithdrawalRequestListItem {
  id: string;
  requestNumber: string;
  store: {
    id: string;
    name: string;
    email: string;
  };
  requestedAmount: number;
  netAmount: number;
  status:
    | "pending"
    | "under_review"
    | "approved"
    | "processing"
    | "completed"
    | "rejected"
    | "failed";
  createdAt: string;
}

/**
 * Interface for the response when listing withdrawal requests
 */
export interface GetWithdrawalRequestsResponse {
  success: true;
  requests: FormattedWithdrawalRequestListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  summary: {
    totalPending: number;
    totalApprovedAmount: number;
  };
}

/**
 * Interface for input to approve a withdrawal request (admin-facing)
 */
export interface ApproveWithdrawalRequestInput {
  requestId: string;
  transactionReference: string; // Reference from the payment gateway
  notes?: string; // Admin notes for approval
}

/**
 * Interface for input to reject a withdrawal request (admin-facing)
 */
export interface RejectWithdrawalRequestInput {
  requestId: string;
  reason: string; // Reason for rejection
  notes?: string; // Admin notes for rejection
}

/**
 * Interface for the response after approving/rejecting a withdrawal request
 */
export interface AdminWithdrawalActionResponse {
  success: true;
  message: string;
  withdrawalRequest: {
    id: string;
    requestNumber: string;
    status: "approved" | "rejected" | "processing" | "completed" | "failed";
    updatedAt: string;
  };
}

/**
 * Interface for audit log details specific to withdrawal requests
 */
export interface WithdrawalAuditDetails {
  action:
    | "withdrawal_request_created"
    | "withdrawal_request_approved"
    | "withdrawal_request_rejected"
    | "withdrawal_request_processed"
    | "withdrawal_request_failed";
  requestId: string;
  requestNumber: string;
  storeId: string;
  storeName: string;
  requestedAmount: number;
  netAmount: number;
  status: string;
  transactionReference?: string;
  rejectionReason?: string;
  adminNotes?: string;
}
