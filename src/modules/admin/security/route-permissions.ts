import { PERMISSIONS, Permission } from "./permissions";

export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  // Dashboard (accessible by any admin)
  "/admin/dashboard": [],

  // Product routes
  "/admin/products": [PERMISSIONS.VIEW_PRODUCTS],

  // Order routes
  "/admin/orders": [PERMISSIONS.VIEW_ORDERS],
  "/admin/orders/stale": [PERMISSIONS.STALE_ORDERS],

  // Store routes
  "/admin/stores": [PERMISSIONS.VIEW_STORES],
  "/admin/stores/[storeId]": [
    PERMISSIONS.VERIFY_STORE,
    PERMISSIONS.SUSPEND_STORE,
    PERMISSIONS.REJECT_STORE,
  ],

  // Finance
  "/admin/escrow/release-queue": [
    PERMISSIONS.VIEW_ESCROW,
    PERMISSIONS.PROCESS_ESCROW,
  ],
  "/admin/escrow/release-queue/[subOrderId]": [PERMISSIONS.PROCESS_ESCROW],
  "/admin/finance/withdrawals": [PERMISSIONS.VIEW_WITHDRAWALS],
  "/admin/finance/withdrawals/[requestId]": [PERMISSIONS.VIEW_WITHDRAWALS],
  "/admin/refunds/queue": [PERMISSIONS.VIEW_REFUNDS],

  // Admin management
  "/admin/manage-admins": [PERMISSIONS.MANAGE_ADMINS],

  // Audit logs
  "/admin/audit-logs": [PERMISSIONS.VIEW_AUDIT_LOGS],

  // User management
  "/admin/users": [PERMISSIONS.VIEW_USERS],
  "/admin/verify-user": [PERMISSIONS.VERIFY_USER],
  "/admin/suspend-user": [PERMISSIONS.SUSPEND_USER],

  // Super-dashboard
  "/admin/super-dashboard": [PERMISSIONS.VIEW_SUPER_DASHBOARD],
};
