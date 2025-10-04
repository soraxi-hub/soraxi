// Define all possible admin permissions
export const PERMISSIONS = {
  // Product permissions
  VIEW_PRODUCTS: "view_products",
  // CREATE_PRODUCT: "create_product",
  // EDIT_PRODUCT: "edit_product",  admins should not perform any of this actions for now
  // DELETE_PRODUCT: "delete_product",
  VERIFY_PRODUCT: "verify_product",
  UNVERIFY_PRODUCT: "unverify_product",
  REJECT_PRODUCT: "reject_product",
  UNPUBLISH_PRODUCT: "unpublish_product",

  // Order permissions
  VIEW_ORDERS: "view_orders",
  STALE_ORDERS: "stale_orders",
  UPDATE_ORDER: "update_order",
  CANCEL_ORDER: "cancel_order",

  // Store permissions
  VIEW_STORES: "view_stores",
  // CREATE_STORE: "create_store",
  // EDIT_STORE: "edit_store", admins should not perform any of this actions for now
  // DELETE_STORE: "delete_store",
  VERIFY_STORE: "verify_store",
  SUSPEND_STORE: "suspend_store",
  REJECT_STORE: "reject_store",

  // Finance permissions
  VIEW_ESCROW: "view_escrow",
  VIEW_WITHDRAWALS: "view_withdrawals",
  VIEW_REFUNDS: "view_refunds",
  PROCESS_ESCROW: "process_escrow",
  PROCESS_REFUND: "process_refund",
  PROCESS_WITHDRAWAL: "process_withdrawal",

  // Admin management
  MANAGE_ADMINS: "manage_admins",
  ACTIVATE_ADMIN: "activate_admin",
  SUSPEND_ADMIN: "suspend_admin",

  // Audit logs
  VIEW_AUDIT_LOGS: "view_audit_logs",

  // User management (optional)
  VIEW_USERS: "view_users",
  VERIFY_USER: "verify_user",
  SUSPEND_USER: "suspend_user",

  // Permissions for super Admins
  VIEW_SUPER_DASHBOARD: "view_super_dashboard",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
