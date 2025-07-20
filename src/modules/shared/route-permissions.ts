// route-permissions.ts

import { PERMISSIONS, Permission } from "./permissions";

export const ROUTE_PERMISSIONS: Record<string, Permission[]> = {
  // Dashboard (accessible by any admin)
  "/admin/dashboard": [],

  // Product routes
  "/admin/products": [PERMISSIONS.VIEW_PRODUCTS],
  "/admin/create-product": [PERMISSIONS.CREATE_PRODUCT],
  "/admin/edit-product": [PERMISSIONS.EDIT_PRODUCT],
  "/admin/verify-products": [PERMISSIONS.VERIFY_PRODUCT],

  // Order routes
  "/admin/orders": [PERMISSIONS.VIEW_ORDERS],
  "/admin/order-details": [PERMISSIONS.VIEW_ORDERS],

  // Store routes
  "/admin/stores": [PERMISSIONS.VIEW_STORES],
  "/admin/create-store": [PERMISSIONS.CREATE_STORE],
  "/admin/edit-store": [PERMISSIONS.EDIT_STORE],
  "/admin/verify-seller": [PERMISSIONS.VERIFY_STORE],
  "/admin/suspend-store": [PERMISSIONS.SUSPEND_STORE],
  "/admin/reject-store": [PERMISSIONS.REJECT_STORE],

  // Customer support
  "/admin/customer-tickets": [PERMISSIONS.VIEW_TICKETS],
  "/admin/support-dashboard": [PERMISSIONS.VIEW_TICKETS],

  // Finance
  "/admin/settlement": [
    PERMISSIONS.VIEW_SETTLEMENTS,
    PERMISSIONS.PROCESS_SETTLEMENT,
  ],
  "/admin/financial-reports": [PERMISSIONS.VIEW_FINANCIAL_REPORTS],

  // Admin management
  "/admin/manage-admins": [PERMISSIONS.MANAGE_ADMINS],
  "/admin/activate-admin": [PERMISSIONS.ACTIVATE_ADMIN],
  "/admin/suspend-admin": [PERMISSIONS.SUSPEND_ADMIN],

  // Audit logs
  "/admin/audit-logs": [PERMISSIONS.VIEW_AUDIT_LOGS],

  // User management
  "/admin/users": [PERMISSIONS.VIEW_USERS],
  "/admin/verify-user": [PERMISSIONS.VERIFY_USER],
  "/admin/suspend-user": [PERMISSIONS.SUSPEND_USER],
};
