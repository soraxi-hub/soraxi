"use client";

import type React from "react";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  Store,
  Package,
  ShoppingCart,
  ShoppingBag,
  // DollarSign,
  Wallet,
  CreditCard,
  RefreshCcw,
  Users,
  FileText,
  LogOut,
  Shield,
  BarChart3,
  Bell,
} from "lucide-react";
import { siteConfig } from "@/config/site";
import axios from "axios";
import { toast } from "sonner";
import { ThemeSwitcher } from "@/components/ui/theme-toggler";
import { PERMISSIONS } from "./security/permissions";

/**
 * Admin Layout Component
 * Provides navigation and layout structure for admin dashboard
 */

interface AdminLayoutProps {
  children: React.ReactNode;
  admin?: {
    id: string;
    name: string;
    email: string;
    roles: string[];
    avatar?: string;
  };
}

const navigationItems = [
  {
    title: "Overview",
    items: [
      {
        title: "Dashboard",
        url: "/admin/dashboard",
        icon: BarChart3,
        permissions: [],
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
      // {
      //   title: "Pending Approvals",
      //   url: "/admin/stores/pending",
      //   icon: Shield,
      //   permissions: ["verify_store"],
      // },
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
      // {
      //   title: "Product Moderation",
      //   url: "/admin/products/moderation",
      //   icon: Shield,
      //   permissions: ["verify_product"],
      // },
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
        permissions: [PERMISSIONS.VIEW_ORDERS],
      },
    ],
  },
  {
    title: "Escrow Management",
    items: [
      {
        title: "Escrow Release Queue",
        url: "/admin/escrow/release-queue",
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
        permissions: [PERMISSIONS.VIEW_ESCROW],
      },
      {
        title: "Refunds",
        url: "/admin/refunds/queue",
        icon: RefreshCcw,
        permissions: [PERMISSIONS.VIEW_ESCROW],
      },
      // {
      //   title: "Financial Reports",
      //   url: "/admin/finance/reports",
      //   icon: BarChart3,
      //   permissions: ["view_financial_reports"],
      // },
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
      {
        title: "Super Dashboard",
        url: "/admin/super-dashboard",
        icon: Bell,
        permissions: [PERMISSIONS.VIEW_SUPER_DASHBOARD],
      },
    ],
  },
];

export function AdminLayout({ children, admin }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      const response = await axios.post("/api/auth/admin-sign-out");
      if (response.status === 200) {
        router.push("/admin/dashboard");
        router.refresh();
        toast.success("Logged out successfully");
        return;
      }
      toast.error("Logout failed. Please try again.");
    } catch (error) {
      return error;
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Sidebar */}
        <Sidebar className="border-r border-border">
          <SidebarHeader className="border-b border-border p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-soraxi-green rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Admin Panel
                </h2>
                <p className="text-xs text-muted-foreground">
                  {siteConfig.name} Platform
                </p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent>
            {navigationItems.map((section) => (
              <SidebarGroup key={section.title}>
                <SidebarGroupLabel>{section.title}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {section.items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.url}
                          className="w-full justify-start"
                        >
                          <a
                            href={item.url}
                            className="flex items-center space-x-2"
                          >
                            <item.icon className="w-4 h-4" />
                            <span>{item.title}</span>
                          </a>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter className="border-t border-border p-4">
            {admin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full justify-start p-2">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={admin.avatar || "/placeholder.svg"} />
                        <AvatarFallback className="bg-soraxi-green text-white text-xs">
                          {getInitials(admin.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left">
                        <p className="text-sm font-medium text-foreground">
                          {admin.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {admin.email}
                        </p>
                      </div>
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div>
                      <p className="font-medium">{admin.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {admin.email}
                      </p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {admin.roles.map((role) => (
                          <Badge
                            key={role}
                            variant="secondary"
                            className="text-xs"
                          >
                            {role.replace("_", " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex items-center justify-between gap-2">
                    <span>Theme</span>
                    <ThemeSwitcher page="admin" />
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </SidebarFooter>
        </Sidebar>

        {/* Main Content */}
        <SidebarInset className="flex-1">
          <SidebarTrigger />
          {/* Page Content */}
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
