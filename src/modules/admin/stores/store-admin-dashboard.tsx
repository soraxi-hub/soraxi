"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CheckCircle,
  XCircle,
  Pause,
  Play,
  Shield,
  Eye,
  Mail,
  FileText,
  AlertTriangle,
  Users,
  Package,
  Star,
  Calendar,
  MoreHorizontal,
} from "lucide-react";
import {
  StoreAdminManager,
  type ActionSummary,
} from "@/domain/stores/store-admin-manager";
import { toast } from "sonner";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/trpc/routers/_app";
import { cx } from "class-variance-authority";
import Image from "next/image";

export type StoreDataProfileAdminView = inferProcedureOutput<
  AppRouter["adminStore"]["getStoreProfileAdminView"]
>;

export type AdminAction = "approved" | "rejected" | "reactivate" | "suspend";

interface StoreAdminDashboardProps {
  storeData: StoreDataProfileAdminView;
  onAction: (storeId: string, action: AdminAction) => Promise<void>;
}

export function StoreAdminDashboard({
  storeData,
  onAction,
}: StoreAdminDashboardProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedAction, setSelectedAction] = useState<AdminAction | null>(
    null
  );

  // Initialize the OOP manager
  const adminManager = new StoreAdminManager(storeData);
  const actionSummary: ActionSummary = adminManager.getActionSummary();
  const availableActions = adminManager.getAvailableActions();

  const handleAction = async (action: AdminAction) => {
    setIsLoading(true);
    try {
      await onAction(storeData._id, action);
      toast.success(`Action "${action}" completed successfully`);
    } catch (error) {
      toast.error(`Failed to execute action: ${error}`);
    } finally {
      setIsLoading(false);
      setSelectedAction(null);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      active:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
      suspended: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
      rejected: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
    };
    return colors[status as keyof typeof colors] || colors.pending;
  };

  const getRiskColor = (level: string) => {
    const colors = {
      low: "text-green-600",
      medium: "text-yellow-600",
      high: "text-red-600",
    };
    return colors[level as keyof typeof colors];
  };

  const getIconComponent = (iconName: string) => {
    const icons = {
      CheckCircle,
      XCircle,
      Pause,
      Play,
      Shield,
      Eye,
      Mail,
      FileText,
    };
    const IconComponent = icons[iconName as keyof typeof icons];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : null;
  };

  return (
    <div className="space-y-6">
      {/* Store Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-col sm:flex-row w-full">
            <div className="space-y-2">
              <div className="flex sm:items-center gap-3 flex-col sm:flex-row">
                <h1 className="text-2xl font-bold">{storeData.name}</h1>
                <Badge className={getStatusColor(storeData.status)}>
                  {storeData.status}
                </Badge>
                {storeData.verification?.isVerified && (
                  <Badge variant="outline" className="text-green-600">
                    <Shield className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{storeData.storeEmail}</p>
              <p className="text-sm text-muted-foreground">
                ID: {storeData.uniqueId}
              </p>
            </div>

            {/* Quick Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="w-full sm:w-fit">
                  <MoreHorizontal className="w-4 h-4" />
                  Actions
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Store Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableActions.map((action) => (
                  <DropdownMenuItem
                    key={action.type}
                    onClick={() =>
                      setSelectedAction(action.type as AdminAction)
                    }
                    className={
                      action.variant === "destructive" ? "text-red-600" : ""
                    }
                  >
                    {getIconComponent(action.icon)}
                    <span className="ml-2">{action.label}</span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
      </Card>

      {/* Action Summary Alert */}
      <Alert
        className={`border-l-4 ${
          actionSummary.priority === "high"
            ? "border-l-red-500"
            : actionSummary.priority === "medium"
            ? "border-l-yellow-500"
            : "border-l-green-500"
        }`}
      >
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Recommended Action:</strong> {actionSummary.recommendedAction}
        </AlertDescription>
      </Alert>

      {/* Analytics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Products</p>
                <p className="text-2xl font-bold">
                  {actionSummary.analytics.totalProducts}
                </p>
              </div>
              <Package className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Followers</p>
                <p className="text-2xl font-bold">
                  {actionSummary.analytics.totalFollowers}
                </p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Rating</p>
                <p className="text-2xl font-bold">
                  {actionSummary.analytics.averageRating.toFixed(1)}
                </p>
              </div>
              <Star className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Account Age</p>
                <p className="text-2xl font-bold">
                  {actionSummary.analytics.accountAge}d
                </p>
              </div>
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid grid-cols-2 h-fit w-full md:grid-cols-4 text-xs sm:text-base">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Store Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Business Type
                    </p>
                    <p className="font-medium">
                      {actionSummary.analytics.businessType}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Verification Status
                    </p>
                    <p className="font-medium">
                      {actionSummary.analytics.isVerified
                        ? "Verified"
                        : "Unverified"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Reviews</p>
                    <p className="font-medium">
                      {actionSummary.analytics.reviewCount}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Complaints</p>
                    <p className="font-medium text-red-600">
                      {actionSummary.analytics.complaintCount}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Store Description</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {storeData.description || "No description provided"}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Risk Assessment
                <Badge className={getRiskColor(actionSummary.risk.level)}>
                  {actionSummary.risk.level.toUpperCase()}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="text-sm">Risk Score</span>
                  <span className="text-sm font-medium">
                    {actionSummary.risk.score}/100
                  </span>
                </div>
                <Progress value={actionSummary.risk.score} className="h-2" />
              </div>

              {actionSummary.risk.factors.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Risk Factors:</p>
                  <ul className="space-y-1">
                    {actionSummary.risk.factors.map((factor, index) => (
                      <li
                        key={index}
                        className="text-sm text-muted-foreground flex items-center gap-2"
                      >
                        <AlertTriangle className="w-3 h-3 text-yellow-500" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compliance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Compliance Status
                <Badge variant="outline">
                  {actionSummary.compliance.score}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress
                value={actionSummary.compliance.score}
                className="h-2"
              />

              <div className="space-y-3">
                {actionSummary.compliance.checks.map((check, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{check.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {check.description}
                      </p>
                    </div>
                    <Badge
                      className={
                        check.status === "passed"
                          ? "bg-green-100 text-green-800"
                          : check.status === "warning"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {check.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Products ({storeData.products?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {storeData.products?.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {storeData.products.slice(0, 6).map((product) => (
                    <div key={product._id} className="border rounded-lg p-4">
                      <div className="aspect-square bg-muted rounded-lg mb-2">
                        {product.images?.[0] && (
                          <Image
                            src={product.images[0] || "/placeholder.svg"}
                            alt={product.name}
                            // fill
                            className="w-full h-full object-cover rounded-lg"
                          />
                        )}
                      </div>
                      <h4 className="font-medium truncate">{product.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        ₦{product.price}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No products found
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Confirmation Dialog */}
      <Dialog
        open={!!selectedAction}
        onOpenChange={() => setSelectedAction(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Action</DialogTitle>
            <DialogDescription>
              Are you sure you want to {selectedAction} this store? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setSelectedAction(null)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedAction && handleAction(selectedAction)}
              disabled={isLoading}
              variant={
                selectedAction?.includes("suspend") ||
                selectedAction?.includes("reject")
                  ? "destructive"
                  : "default"
              }
              className={cx(
                !(
                  selectedAction?.includes("suspend") ||
                  selectedAction?.includes("reject")
                ) && "text-white bg-soraxi-green hover:bg-soraxi-green-hover"
              )}
            >
              {isLoading ? "Processing..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
