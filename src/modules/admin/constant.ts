import {
  Store,
  Package,
  ShoppingCart,
  Wallet,
  CreditCard,
  Users,
  FileText,
  BarChart3,
  Ticket,
  AlertTriangle,
  List,
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
      {
        title: "Wait list",
        url: "/admin/waitlist",
        icon: List,
        permissions: [PERMISSIONS.VIEW_WAITLIST],
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
        title: "Disputes",
        url: "/admin/disputes",
        icon: AlertTriangle,
        permissions: [PERMISSIONS.RESOLVE_DISPUTES],
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        title: "Payouts",
        url: "/admin/payouts",
        icon: CreditCard,
        permissions: [PERMISSIONS.VIEW_WITHDRAWALS],
      },
      {
        title: "Wallet",
        url: "/admin/platform-wallet",
        icon: Wallet,
        permissions: [PERMISSIONS.VIEW_PLATFORM_WALLET],
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
