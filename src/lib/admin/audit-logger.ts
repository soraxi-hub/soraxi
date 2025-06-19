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
 * Common audit log actions
 */
export const AUDIT_ACTIONS = {
  // Store actions
  STORE_APPROVED: "Store Approved",
  STORE_REJECTED: "Store Rejected",
  STORE_SUSPENDED: "Store Suspended",
  STORE_REACTIVATED: "Store Reactivated",
  STORE_VIEWED: "Store Viewed",
  STORE_NOTE_ADDED: "Store Note Added",

  // Product actions
  PRODUCT_APPROVED: "Product Approved",
  PRODUCT_REJECTED: "Product Rejected",
  PRODUCT_UNPUBLISHED: "Product Unpublished",
  PRODUCT_DELETED: "Product Deleted",
  PRODUCT_VIEWED: "Product Viewed",

  // Order actions
  ORDER_STATUS_UPDATED: "Order Status Updated",
  ORDER_CANCELLED: "Order Cancelled",
  ORDER_VIEWED: "Order Viewed",

  // Finance actions
  PAYOUT_PROCESSED: "Payout Processed",
  SETTLEMENT_TRIGGERED: "Settlement Triggered",
  FINANCIAL_REPORT_VIEWED: "Financial Report Viewed",

  // Admin actions
  ADMIN_CREATED: "Admin Created",
  ADMIN_UPDATED: "Admin Updated",
  ADMIN_SUSPENDED: "Admin Suspended",
  ADMIN_ACTIVATED: "Admin Activated",
  ADMIN_DELETED: "Admin Deleted",

  // General actions
  LOGIN: "Admin Login",
  LOGOUT: "Admin Logout",
} as const;

/**
 * Module names for audit logging
 */
export const AUDIT_MODULES = {
  STORES: "stores",
  PRODUCTS: "products",
  ORDERS: "orders",
  FINANCE: "finance",
  ADMINS: "admins",
  AUTH: "auth",
  DASHBOARD: "dashboard",
} as const;
