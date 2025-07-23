import { getAuditLogModel } from "@/lib/db/models/audit-log.model";
import type { Role } from "@/modules/shared/roles";
import { NextRequest } from "next/server";

/**
 * Audit Logger Utility
 * Logs all admin actions for accountability and traceability
 */

export interface AuditLogData {
  adminId: string;
  adminName: string;
  adminEmail: string;
  adminRoles: Role[];
  action: string;
  module: string;
  resourceId?: string;
  resourceType?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  request?: NextRequest;
}

/**
 * Log an admin action to the audit trail
 */
export async function logAdminAction(data: AuditLogData): Promise<void> {
  try {
    const AuditLog = await getAuditLogModel();

    await AuditLog.create({
      adminId: data.adminId,
      adminName: data.adminName,
      adminEmail: data.adminEmail,
      adminRoles: data.adminRoles,
      action: data.action,
      myModule: data.module, // Using myModule since module is reserved
      resourceId: data.resourceId,
      resourceType: data.resourceType,
      details: data.details,
      ipAddress:
        data.request?.headers.get("x-forwarded-for") ||
        data.ipAddress ||
        "Unknown",
      userAgent:
        data.request?.headers.get("user-agent") || data.userAgent || "Unknown",
    });
  } catch (error) {
    console.error("Failed to log admin action:", error);
    // Don't throw error to avoid breaking the main operation
  }
}

/**
 * Audit Actions Enum
 *
 * Defines all possible admin actions that can be logged for audit purposes.
 * This ensures consistency across the application and makes it easier to
 * track and analyze admin activities.
 */
export const AUDIT_ACTIONS = {
  // Store Management
  STORE_VIEWED: "store_viewed",
  STORE_APPROVED: "store_approved",
  STORE_REJECTED: "store_rejected",
  STORE_SUSPENDED: "store_suspended",
  STORE_REACTIVATED: "store_reactivated",
  STORE_NOTE_ADDED: "Store Note Added",

  // Product Management
  PRODUCT_VIEWED: "product_viewed",
  PRODUCT_APPROVED: "product_approved",
  PRODUCT_REJECTED: "product_rejected",
  PRODUCT_REMOVED: "product_removed",
  PRODUCT_DELETED: "Product Deleted",

  // Order Management
  ORDER_VIEWED: "order_viewed",
  ORDER_STATUS_CHANGED: "order_status_changed",
  ORDER_CANCELLED: "order_cancelled",

  // Finance Management
  PAYOUT_PROCESSED: "payout_processed",
  PAYOUT_REJECTED: "payout_rejected",
  REFUND_APPROVED: "refund_approved",
  REFUND_REJECTED: "refund_rejected",
  SETTLEMENT_TRIGGERED: "Settlement Triggered",
  FINANCIAL_REPORT_VIEWED: "Financial Report Viewed",

  // Refund Management
  REFUND_QUEUE_VIEWED: "refund_queue_viewed",
  REFUND_DETAIL_VIEWED: "refund_detail_viewed",

  // User Management
  USER_VIEWED: "user_viewed",
  USER_SUSPENDED: "user_suspended",
  USER_REACTIVATED: "user_reactivated",

  // Admin Management
  ADMIN_CREATED: "Admin Created",
  ADMIN_UPDATED: "Admin Updated",
  ADMIN_SUSPENDED: "Admin Suspended",
  ADMIN_ACTIVATED: "Admin Activated",
  ADMIN_DELETED: "Admin Deleted",

  // Newly Added
  DELIVERY_CONFIRMATION_QUEUE_VIEWED: "DELIVERY_CONFIRMATION_QUEUE_VIEWED",
  DELIVERY_MANUALLY_CONFIRMED: "DELIVERY_MANUALLY_CONFIRMED",

  // System Actions
  LOGIN: "Admin Login",
  LOGOUT: "Admin Logout",
  SETTINGS_CHANGED: "settings_changed",
} as const;

/**
 * Audit Modules Enum
 *
 * Defines the different modules/sections of the admin system.
 * This helps categorize audit logs and makes it easier to filter
 * and analyze activities by functional area.
 */
export const AUDIT_MODULES = {
  STORES: "stores",
  PRODUCTS: "products",
  ORDERS: "orders",
  FINANCE: "finance",
  REFUNDS: "refunds",
  USERS: "users",
  SYSTEM: "system",
  ADMINS: "admins",
  AUTH: "auth",
  DASHBOARD: "dashboard",
  DELIVERIES: "deliveries",
} as const;

/**
 * Audit Log Entry Interface
 *
 * Defines the structure of an audit log entry with all necessary
 * information for tracking admin activities.
 */
export interface IAuditLog extends Document {
  adminId: string;
  adminName: string;
  adminEmail: string;
  adminRoles: string[];
  action: string;
  module: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
}

/**
 * Log Admin Action Interface
 *
 * Defines the parameters required to log an admin action.
 */
export interface LogAdminActionParams {
  adminId: string;
  adminName: string;
  adminEmail: string;
  adminRoles: string[];
  action: string;
  module: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Log Admin Action Function
 *
 * Creates an audit log entry for an admin action. This function should be
 * called whenever an admin performs any significant action in the system.
 *
 * Features:
 * - Automatic timestamp generation
 * - Error handling with fallback logging
 * - Flexible details object for action-specific data
 * - IP address and user agent tracking
 *
 * @param params - The audit log parameters
 * @returns Promise that resolves when the log is saved
 */
// export async function logAdminAction(
//   params: LogAdminActionParams
// ): Promise<void> {
//   try {
//     const AuditLog = await getAuditLogModel();

//     const auditEntry = new AuditLog({
//       adminId: params.adminId,
//       adminName: params.adminName,
//       adminEmail: params.adminEmail,
//       adminRoles: params.adminRoles,
//       action: params.action,
//       module: params.module,
//       details: params.details || {},
//       ipAddress: params.ipAddress,
//       userAgent: params.userAgent,
//       timestamp: new Date(),
//     });

//     await auditEntry.save();

//     // Optional: Log to console in development
//     if (process.env.NODE_ENV === "development") {
//       console.log(
//         `[AUDIT] ${params.adminEmail} performed ${params.action} in ${params.module}`,
//         params.details
//       );
//     }
//   } catch (error) {
//     // Log the error but don't throw it to avoid breaking the main functionality
//     console.error("Failed to log admin action:", error);

//     // Fallback: Log to console at minimum
//     console.log(
//       `[AUDIT FALLBACK] ${params.adminEmail} performed ${params.action} in ${params.module}`,
//       params.details
//     );
//   }
// }

/**
 * Get Audit Logs Function
 *
 * Retrieves audit logs with filtering and pagination options.
 * Useful for building audit log viewers and reports.
 *
 * @param filters - Optional filters for the query
 * @param options - Optional pagination and sorting options
 * @returns Promise that resolves to the filtered audit logs
 */
export interface GetAuditLogsFilters {
  adminId?: string;
  adminEmail?: string;
  action?: string;
  module?: string;
  startDate?: Date;
  endDate?: Date;
}

export interface GetAuditLogsOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// export async function getAuditLogs(
//   filters: GetAuditLogsFilters = {},
//   options: GetAuditLogsOptions = {}
// ): Promise<{
//   logs: IAuditLog[];
//   total: number;
//   page: number;
//   pages: number;
// }> {
//   try {
//     const AuditLog = await getAuditLogModel();

//     // Build query
//     const query: any = {};

//     if (filters.adminId) query.adminId = filters.adminId;
//     if (filters.adminEmail) query.adminEmail = filters.adminEmail;
//     if (filters.action) query.action = filters.action;
//     if (filters.module) query.module = filters.module;

//     if (filters.startDate || filters.endDate) {
//       query.timestamp = {};
//       if (filters.startDate) query.timestamp.$gte = filters.startDate;
//       if (filters.endDate) query.timestamp.$lte = filters.endDate;
//     }

//     // Pagination
//     const page = options.page || 1;
//     const limit = options.limit || 50;
//     const skip = (page - 1) * limit;

//     // Sorting
//     const sortBy = options.sortBy || "timestamp";
//     const sortOrder = options.sortOrder || "desc";
//     const sort = { [sortBy]: sortOrder === "desc" ? -1 : 1 };

//     // Execute queries
//     const [logs, total] = await Promise.all([
//       AuditLog.find(query).sort(sort).skip(skip).limit(limit).lean(),
//       AuditLog.countDocuments(query),
//     ]);

//     return {
//       logs,
//       total,
//       page,
//       pages: Math.ceil(total / limit),
//     };
//   } catch (error) {
//     console.error("Failed to get audit logs:", error);
//     throw new Error("Failed to retrieve audit logs");
//   }
// }
