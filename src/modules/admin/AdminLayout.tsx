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
  DollarSign,
  Users,
  FileText,
  Settings,
  LogOut,
  Shield,
  BarChart3,
  Bell,
} from "lucide-react";
import { siteConfig } from "@/config/site";

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
        permissions: ["view_stores"],
      },
      {
        title: "Pending Approvals",
        url: "/admin/stores/pending",
        icon: Shield,
        permissions: ["verify_store"],
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
        permissions: ["view_products"],
      },
      {
        title: "Product Moderation",
        url: "/admin/products/moderation",
        icon: Shield,
        permissions: ["verify_product"],
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
        permissions: ["view_orders"],
      },
      {
        title: "Stale Orders",
        url: "/admin/orders/stale",
        icon: ShoppingCart,
        permissions: ["view_orders"],
      },
    ],
  },
  {
    title: "Escrow Management",
    items: [
      {
        title: "Refunds",
        url: "/admin/escrow/release-queue",
        icon: DollarSign,
        permissions: ["view_settlements"],
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        title: "withdrawals",
        url: "/admin/finance/withdrawals",
        icon: DollarSign,
        permissions: ["view_settlements"],
      },
      {
        title: "Refunds",
        url: "/admin/refunds/queue",
        icon: DollarSign,
        permissions: ["view_settlements"],
      },
      {
        title: "Financial Reports",
        url: "/admin/finance/reports",
        icon: BarChart3,
        permissions: ["view_financial_reports"],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      {
        title: "Admin Users",
        url: "/admin/admins",
        icon: Users,
        permissions: ["manage_admins"],
      },
      {
        title: "Audit Logs",
        url: "/admin/audit-logs",
        icon: FileText,
        permissions: ["view_audit_logs"],
      },
      {
        title: "Super Dashboard",
        url: "/admin/super-dashboard",
        icon: Bell,
        permissions: ["super_admin_access"],
      },
    ],
  },
];

export function AdminLayout({ children, admin }: AdminLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    // Implement logout logic
    router.push("/admin/login");
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
                  <DropdownMenuItem>
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
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
