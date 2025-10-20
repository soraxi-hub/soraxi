"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Package,
  CheckCircle,
  XCircle,
  Store,
  AlertTriangle,
  ShieldCheck,
  Calendar,
  Tag,
  ImageIcon,
} from "lucide-react";
import { formatNaira } from "@/lib/utils/naira";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ProductAdminManager } from "@/domain/products/product-admin-manager";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/trpc/routers/_app";
import { renderRichText } from "@/modules/products/product-detail/product-tabs";

type Product = inferProcedureOutput<AppRouter["admin"]["getById"]>;

interface ProductDetailManagementProps {
  product: Product;
  refetchAction: () => void;
}

export function ProductDetailManagement({
  product,
  refetchAction,
}: ProductDetailManagementProps) {
  const trpc = useTRPC();
  const router = useRouter();
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [selectedAction, setSelectedAction] = useState<
    "approve" | "reject" | null
  >(null);
  const [actionReason, setActionReason] = useState("");

  const productManager = new ProductAdminManager(product);
  const actionSummary = productManager.getActionSummary();

  const mutation = useMutation(
    trpc.admin.action.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        setShowActionDialog(false);
        setActionReason("");
        refetchAction();
      },
      onError: (error) => {
        toast.error(error.message || "Action failed");
      },
    })
  );

  const handleAction = (action: "approve" | "reject") => {
    setSelectedAction(action);
    setShowActionDialog(true);
  };

  const confirmAction = () => {
    if (!selectedAction) return;

    mutation.mutate({
      productId: product.id,
      action: selectedAction,
      reason: actionReason || undefined,
    });
  };

  const getStatusBadge = (status: string) => {
    const colors = {
      approved:
        "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      pending:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };

    return (
      <Badge className={colors[status as keyof typeof colors]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getRiskBadge = (level: string) => {
    const colors = {
      low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      medium:
        "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      high: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };

    return (
      <Badge className={colors[level as keyof typeof colors]}>
        {level.charAt(0).toUpperCase() + level.slice(1)} Risk
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Product Management
            </h1>
            <p className="text-muted-foreground">
              Review and moderate product listing
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(product.status)}
          {product.isVerifiedProduct && (
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Verified
            </Badge>
          )}
        </div>
      </div>

      {/* Risk Assessment Alert */}
      {actionSummary.risk.level === "high" && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>High Risk Product</AlertTitle>
          <AlertDescription>
            {actionSummary.recommendedAction}
            <ul className="mt-2 list-disc list-inside">
              {actionSummary.risk.factors.map((factor, index) => (
                <li key={index}>{factor}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="w-5 h-5" />
                Product Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              {product.images && product.images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {product.images.map((image: string, index: number) => (
                    <div
                      key={index}
                      className="aspect-square bg-muted rounded-lg overflow-hidden"
                    >
                      <Image
                        width={200}
                        height={200}
                        src={image || "/placeholder.svg"}
                        alt={`${product.name} ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center h-40 bg-muted rounded-lg">
                  <div className="text-center text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-2" />
                    <p>No images available</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Product Name</Label>
                <p className="text-lg font-semibold mt-1">{product.name}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Description</Label>
                {product.description ? (
                  renderRichText(product.description)
                ) : (
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    No description available for this product.
                  </p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium">Specifications</Label>
                {product.specifications ? (
                  renderRichText(product.specifications)
                ) : (
                  <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                    No specifications available for this product.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    Price
                  </Label>
                  <p className="text-lg font-semibold mt-1">
                    {formatNaira(product.price ? product.price : 0)}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="w-4 h-4" />
                    Category
                  </Label>
                  <Badge variant="outline" className="mt-1">
                    {product.category}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Created
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(product.createdAt).toLocaleString()}
                  </p>
                </div>

                <div>
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Last Updated
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(product.updatedAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* {product.moderationNotes && (
                <div>
                  <Label className="text-sm font-medium">
                    Moderation Notes
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {product.moderationNotes}
                  </p>
                </div>
              )} */}
            </CardContent>
          </Card>

          {/* Store Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="w-5 h-5" />
                Store Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm font-medium">Store Name</Label>
                <p className="text-sm mt-1">{product.store.name}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Store Email</Label>
                <p className="text-sm mt-1">{product.store.email}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Store ID</Label>
                <p className="text-sm font-mono mt-1">
                  {product.store.uniqueId}
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium">Store Status</Label>
                <div className="mt-1">
                  {getStatusBadge(product.store.status)}
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full mt-4 bg-transparent"
                onClick={() => router.push(`/admin/stores/${product.store.id}`)}
              >
                <Store className="w-4 h-4 mr-2" />
                View Store Details
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Compliance Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Compliance Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Compliance Score</span>
                  <span className="text-2xl font-bold">
                    {actionSummary.compliance.score}%
                  </span>
                </div>
                <Progress
                  value={actionSummary.compliance.score}
                  className="h-2"
                />
              </div>

              <div className="space-y-2">
                {actionSummary.compliance.checks.map((check, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between p-2 rounded-lg bg-muted"
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{check.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {check.description}
                      </p>
                    </div>
                    {check.status === "passed" ? (
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-1" />
                    ) : check.status === "warning" ? (
                      <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-1" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-1" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risk Assessment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Risk Assessment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Risk Level</span>
                {getRiskBadge(actionSummary.risk.level)}
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Risk Score</span>
                  <span className="text-2xl font-bold">
                    {actionSummary.risk.score}
                  </span>
                </div>
                <Progress value={actionSummary.risk.score} className="h-2" />
              </div>

              {actionSummary.risk.factors.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Risk Factors</Label>
                  <ul className="mt-2 space-y-1">
                    {actionSummary.risk.factors.map((factor, index) => (
                      <li
                        key={index}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                      >
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Admin Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Admin Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Alert>
                <AlertTitle>Recommendation</AlertTitle>
                <AlertDescription className="text-sm">
                  {actionSummary.recommendedAction}
                </AlertDescription>
              </Alert>

              {product.status === "pending" && (
                <>
                  <Button
                    onClick={() => handleAction("approve")}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={mutation.isPending}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Product
                  </Button>
                  <Button
                    onClick={() => handleAction("reject")}
                    variant="destructive"
                    className="w-full"
                    disabled={mutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Reject Product
                  </Button>
                </>
              )}

              {product.status === "approved" && (
                <Button
                  onClick={() => handleAction("reject")}
                  variant="destructive"
                  className="w-full"
                  disabled={mutation.isPending}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Reject Product
                </Button>
              )}

              {product.status === "rejected" && (
                <Button
                  onClick={() => handleAction("approve")}
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={mutation.isPending}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Approve Product
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Action Confirmation Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Confirm{" "}
              {selectedAction
                ? selectedAction.charAt(0).toUpperCase() +
                  selectedAction.slice(1)
                : ""}
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to {selectedAction} this product? This
              action will be logged.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="reason">Reason (Optional)</Label>
              <Textarea
                id="reason"
                placeholder="Provide a reason for this action..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="mt-2"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowActionDialog(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={confirmAction}
              disabled={mutation.isPending}
              variant={selectedAction === "reject" ? "destructive" : "default"}
            >
              {mutation.isPending
                ? "Processing..."
                : `Confirm ${selectedAction}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
