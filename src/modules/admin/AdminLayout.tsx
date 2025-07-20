"use client";

import type React from "react";

import { useState } from "react";
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
  Search,
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
    ],
  },
  {
    title: "Finance",
    items: [
      {
        title: "Payouts",
        url: "/admin/finance/payouts",
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
  const [searchQuery, setSearchQuery] = useState("");

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
          {/* Top Header */}
          <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center justify-between px-6">
              <div className="flex items-center space-x-4">
                <SidebarTrigger />
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search stores, products, orders..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 w-80 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-soraxi-green focus:border-transparent"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-4 h-4" />
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </Button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
