// Define all possible admin permissions
export const PERMISSIONS = {
  // Product permissions
  VIEW_PRODUCTS: "view_products",
  CREATE_PRODUCT: "create_product",
  EDIT_PRODUCT: "edit_product",
  DELETE_PRODUCT: "delete_product",
  VERIFY_PRODUCT: "verify_product",
  UNVERIFY_PRODUCT: "unverify_product",
  REJECT_PRODUCT: "reject_product",
  UNPUBLISH_PRODUCT: "unpublish_product",

  // Order permissions
  VIEW_ORDERS: "view_orders",
  UPDATE_ORDER: "update_order",
  CANCEL_ORDER: "cancel_order",

  // Store permissions
  VIEW_STORES: "view_stores",
  CREATE_STORE: "create_store",
  EDIT_STORE: "edit_store",
  VERIFY_STORE: "verify_store",
  SUSPEND_STORE: "suspend_store",
  REJECT_STORE: "reject_store",
  DELETE_STORE: "delete_store",

  // Customer support permissions
  VIEW_TICKETS: "view_tickets",
  RESPOND_TICKET: "respond_ticket",
  CLOSE_TICKET: "close_ticket",

  // Finance permissions
  VIEW_SETTLEMENTS: "view_settlements",
  PROCESS_SETTLEMENT: "process_settlement",
  VIEW_FINANCIAL_REPORTS: "view_financial_reports",

  // Admin management
  MANAGE_ADMINS: "manage_admins",
  ACTIVATE_ADMIN: "activate_admin",
  SUSPEND_ADMIN: "suspend_admin",
  SUPER_ADMIN_ACCESS: "super_admin_access",

  // Audit logs
  VIEW_AUDIT_LOGS: "view_audit_logs",

  // User management (optional)
  VIEW_USERS: "view_users",
  VERIFY_USER: "verify_user",
  SUSPEND_USER: "suspend_user",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];
