"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Store,
  Package,
  ShoppingCart,
  DollarSign,
  Users,
  TrendingUp,
  AlertCircle,
  Eye,
} from "lucide-react";
import Link from "next/link";

/**
 * Admin Dashboard Page
 * Main overview dashboard for platform administrators
 */
export default function SuperAdminDashboardPage() {
  // Mock admin data - replace with actual auth
  const admin = {
    id: "1",
    name: "John Admin",
    email: "admin@platform.com",
    roles: ["super_admin"],
    avatar: "/placeholder.svg?height=32&width=32",
  };

  // Mock dashboard stats - replace with API calls
  const stats = {
    totalStores: 1247,
    pendingStores: 23,
    totalProducts: 15678,
    pendingProducts: 89,
    totalOrders: 8934,
    totalRevenue: 234567.89,
    activeUsers: 5432,
    pendingPayouts: 12345.67,
  };

  const recentActivity = [
    {
      id: "1",
      type: "store_approval",
      message: "New store 'Tech Gadgets Pro' submitted for approval",
      time: "2 minutes ago",
      status: "pending",
    },
    {
      id: "2",
      type: "product_report",
      message: "Product 'iPhone 15 Pro' reported by customer",
      time: "15 minutes ago",
      status: "urgent",
    },
    {
      id: "3",
      type: "payout_request",
      message: "Payout request of $2,450 from 'Fashion Store'",
      time: "1 hour ago",
      status: "pending",
    },
    {
      id: "4",
      type: "order_issue",
      message: "Order #ORD-12345 requires admin intervention",
      time: "2 hours ago",
      status: "urgent",
    },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "store_approval":
        return Store;
      case "product_report":
        return Package;
      case "payout_request":
        return DollarSign;
      case "order_issue":
        return ShoppingCart;
      default:
        return AlertCircle;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case "urgent":
        return <Badge className="bg-red-100 text-red-800">Urgent</Badge>;
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Welcome back, {admin.name}
        </h1>
        <p className="text-muted-foreground">
          Here&#39;s what&#39;s happening on your platform today.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Stores</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalStores.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              +12% from last month
            </p>
            {stats.pendingStores > 0 && (
              <div className="mt-2">
                <Badge className="bg-yellow-100 text-yellow-800">
                  {stats.pendingStores} pending approval
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalProducts.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              +8% from last month
            </p>
            {stats.pendingProducts > 0 && (
              <div className="mt-2">
                <Badge className="bg-yellow-100 text-yellow-800">
                  {stats.pendingProducts} need review
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalOrders.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              +15% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="w-3 h-3 mr-1 text-green-500" />
              +23% from last month
            </p>
            {stats.pendingPayouts > 0 && (
              <div className="mt-2">
                <Badge className="bg-blue-100 text-blue-800">
                  {formatCurrency(stats.pendingPayouts)} pending payouts
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Store className="w-5 h-5 text-soraxi-green" />
              <span>Pending Stores</span>
            </CardTitle>
            <CardDescription>
              Review and approve new store applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/admin/stores/pending">
                Review {stats.pendingStores} stores
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Package className="w-5 h-5 text-soraxi-green" />
              <span>Product Moderation</span>
            </CardTitle>
            <CardDescription>
              Review flagged and pending products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <a href="/admin/products/moderation">
                Review {stats.pendingProducts} products
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-soraxi-green" />
              <span>Pending Payouts</span>
            </CardTitle>
            <CardDescription>Process seller payout requests</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <a href="/admin/finance/payouts">Process payouts</a>
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="text-base flex items-center space-x-2">
              <Users className="w-5 h-5 text-soraxi-green" />
              <span>User Management</span>
            </CardTitle>
            <CardDescription>
              Manage platform users and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" asChild>
              <a href="/admin/users">Manage users</a>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest platform events requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity) => {
              const Icon = getActivityIcon(activity.type);
              return (
                <div
                  key={activity.id}
                  className="flex items-center space-x-4 p-3 border border-border rounded-lg"
                >
                  <div className="w-10 h-10 bg-soraxi-green/10 rounded-lg flex items-center justify-center">
                    <Icon className="w-5 h-5 text-soraxi-green" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{activity.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {activity.time}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(activity.status)}
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Platform Health */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
            <CardDescription>
              Current platform health indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">API Response Time</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">142ms</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Database Performance</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Optimal</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Payment Gateway</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">Online</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Email Service</span>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <span className="text-sm font-medium">Degraded</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Performing Stores</CardTitle>
            <CardDescription>
              Highest revenue generators this month
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { name: "Tech Gadgets Pro", revenue: 15420.5, growth: 23 },
                { name: "Fashion Forward", revenue: 12890.75, growth: 18 },
                { name: "Home & Garden Plus", revenue: 9876.25, growth: 15 },
                { name: "Sports Equipment Co", revenue: 8543.8, growth: 12 },
              ].map((store, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{store.name}</p>
                    <p className="text-xs text-muted-foreground">
                      +{store.growth}% growth
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">
                      {formatCurrency(store.revenue)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
