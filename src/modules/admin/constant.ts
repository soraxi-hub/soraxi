import {
  Store,
  Package,
  ShoppingCart,
  ShoppingBag,
  Wallet,
  CreditCard,
  RefreshCcw,
  Users,
  FileText,
  BarChart3,
  Ticket,
} from "lucide-react";
import { PERMISSIONS } from "./security/permissions";

export const adminNavigationItems = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/admin/dashboard",
        icon: BarChart3,
        permissions: [],
      },
      {
        title: "Coupons",
        url: "/admin/coupons",
        icon: Ticket,
        permissions: [PERMISSIONS.VIEW_COUPONS],
      },
    ],
  },
  {
    title: "Store Management",
    items: [
      {
        title: "All Stores",
        url: "/admin/stores",
        icon: Store,
        permissions: [PERMISSIONS.VIEW_STORES],
      },
    ],
  },
  {
    title: "Product Management",
    items: [
      {
        title: "All Products",
        url: "/admin/products",
        icon: Package,
        permissions: [PERMISSIONS.VIEW_PRODUCTS],
      },
    ],
  },
  {
    title: "Order Management",
    items: [
      {
        title: "All Orders",
        url: "/admin/orders",
        icon: ShoppingCart,
        permissions: [PERMISSIONS.VIEW_ORDERS],
      },
      {
        title: "Stale Orders",
        url: "/admin/orders/stale",
        icon: ShoppingBag,
        permissions: [PERMISSIONS.STALE_ORDERS],
      },
    ],
  },
  {
    title: "Escrow Management",
    items: [
      {
        title: "Escrow Release",
        url: "/admin/escrow",
        icon: Wallet,
        permissions: [PERMISSIONS.VIEW_ESCROW],
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        title: "withdrawals",
        url: "/admin/finance/withdrawals",
        icon: CreditCard,
        permissions: [PERMISSIONS.VIEW_WITHDRAWALS],
      },
      {
        title: "Refunds",
        url: "/admin/refunds/queue",
        icon: RefreshCcw,
        permissions: [PERMISSIONS.VIEW_REFUNDS],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        title: "Admin Users",
        url: "/admin/manage-admins",
        icon: Users,
        permissions: [PERMISSIONS.MANAGE_ADMINS],
      },
      {
        title: "Audit Logs",
        url: "/admin/audit-logs",
        icon: FileText,
        permissions: [PERMISSIONS.VIEW_AUDIT_LOGS],
      },
    ],
  },
];
