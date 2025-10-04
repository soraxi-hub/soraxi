"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  // ArrowLeft,
  User,
  Store,
  Package,
  CheckCircle,
  Clock,
  AlertCircle,
  Shield,
  MapPin,
  Phone,
  Mail,
} from "lucide-react";
import { format } from "date-fns";
// import Link from "next/link";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { currencyOperations, formatNaira } from "@/lib/utils/naira";
import { withAdminAuth } from "@/modules/auth/with-admin-auth";
import { PERMISSIONS } from "../security/permissions";

interface EscrowReleaseDetailProps {
  subOrderId: string;
}

export function EscrowReleaseDetail({ subOrderId }: EscrowReleaseDetailProps) {
  const trpc = useTRPC();
  const [releasing, setReleasing] = useState(false);
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);
  // const [releaseNotes, setReleaseNotes] = useState("");

  const {
    data,
    refetch: loadSubOrderDetail,
    isLoading: loading,
    error,
  } = useQuery(
    trpc.adminEscrowDetail.getEscrowReleaseDetail.queryOptions({ subOrderId })
  );

  const subOrder = data?.subOrder || null;

  const releaseEscrow = useMutation(
    trpc.adminEscrowRelease.releaseEscrow.mutationOptions({
      onSuccess: (data) => {
        toast.success(
          `Escrow funds of ${formatNaira(
            data.release.amount
          )} released successfully to ${data.release.seller.name}`
        );
        loadSubOrderDetail();
        setReleasing(false);
      },
      onError: (error) => {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to release escrow funds"
        );
        setReleasing(false);
      },
    })
  );

  useEffect(() => {
    loadSubOrderDetail();
  }, [subOrderId]);

  const handleReleaseEscrow = async () => {
    if (!subOrder) return;
    setReleasing(true);

    releaseEscrow.mutate({
      subOrderId,
      // notes: releaseNotes,
    });
  };

  const getPriorityBadge = (daysSinceReturnWindow: number) => {
    if (daysSinceReturnWindow >= 30) {
      return (
        <Badge className="bg-red-100 text-red-800">
          Critical Priority ({daysSinceReturnWindow}d)
        </Badge>
      );
    } else if (daysSinceReturnWindow >= 14) {
      return (
        <Badge className="bg-orange-100 text-orange-800">
          High Priority ({daysSinceReturnWindow}d)
        </Badge>
      );
    } else if (daysSinceReturnWindow >= 7) {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">
          Medium Priority ({daysSinceReturnWindow}d)
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-green-100 text-green-800">
          Normal Priority ({daysSinceReturnWindow}d)
        </Badge>
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-soraxi-green mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading escrow details...</p>
        </div>
      </div>
    );
  }

  if (error || !subOrder) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="font-medium text-lg mb-2">Error Loading Details</h3>
          <p className="text-muted-foreground mb-4">
            {error?.message || "Sub-order not found"}
          </p>
          <Button variant="outline" onClick={() => loadSubOrderDetail()}>
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* <Button variant="outline" size="sm" asChild>
            <Link href="/admin/escrow/release-queue">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Queue
            </Link>
          </Button> */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Escrow Release Details
            </h1>
            <p className="text-muted-foreground">{subOrder.subOrderNumber}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {getPriorityBadge(subOrder.deliveryInfo.daysSinceReturnWindow)}
          {subOrder.eligibilityCheck.isEligible &&
            !subOrder.escrowInfo.released && (
              <Button
                onClick={() => setShowReleaseDialog(true)}
                className="bg-soraxi-green hover:bg-soraxi-green/90 text-white"
              >
                Release Funds (
                {formatNaira(
                  subOrder.escrowInfo.settlementDetails.releaseAmount
                )}
                )
              </Button>
            )}
        </div>
      </div>

      {/* Status Banner */}
      {subOrder.escrowInfo.released ? (
        <Card className="border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="font-medium text-green-800">Escrow Released</h3>
                <p className="text-sm text-green-600">
                  Funds were released on{" "}
                  {format(
                    new Date(subOrder.escrowInfo.releasedAt!),
                    "PPP 'at' p"
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Clock className="w-6 h-6 text-orange-600" />
              <div>
                <h3 className="font-medium text-orange-800">
                  Pending Escrow Release
                </h3>
                <p className="text-sm text-orange-600">
                  Return window passed{" "}
                  {subOrder.deliveryInfo.daysSinceReturnWindow} days ago - ready
                  for release
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Context */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2 text-soraxi-green" />
                Order Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Order Number
                  </Label>
                  <p className="font-medium">
                    {subOrder.orderContext.orderNumber}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Sub-Order Number
                  </Label>
                  <p className="font-medium">{subOrder.subOrderNumber}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Order Total
                  </Label>
                  <p className="font-medium">
                    {formatNaira(subOrder.orderContext.totalAmount)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Sub-Order Total
                  </Label>
                  <p className="font-medium">
                    {formatNaira(
                      subOrder.escrowInfo.settlementDetails.totalAmount
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Order Date
                  </Label>
                  <p className="font-medium">
                    {format(new Date(subOrder.orderContext.createdAt), "PPP")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Payment Status
                  </Label>
                  <Badge variant="secondary">
                    {subOrder.orderContext.paymentStatus || "Completed"}
                  </Badge>
                </div>
              </div>

              {subOrder.orderContext.notes && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Order Notes
                  </Label>
                  <p className="text-sm bg-muted p-3 rounded-md">
                    {subOrder.orderContext.notes}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2 text-soraxi-green" />
                Products ({subOrder.products.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subOrder.products.map((product, index) => (
                  <div
                    key={index}
                    className="flex items-start space-x-4 p-4 border rounded-lg"
                  >
                    <div className="w-16 h-16 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                      {product.images.length > 0 ? (
                        <Image
                          src={product.images[0] || "/placeholder.svg"}
                          alt={product.name}
                          width={64}
                          height={64}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        <Package className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{product.name}</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {product.selectedSize && (
                          <p>
                            Size: {product.selectedSize.size} (+
                            {formatNaira(product.selectedSize.price)})
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {formatNaira(product.price)} × {product.quantity}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total: {formatNaira(product.totalPrice)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Delivery Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="w-5 h-5 mr-2 text-soraxi-green" />
                Delivery Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Delivery Status
                  </Label>
                  <Badge className="bg-green-100 text-green-800">
                    {subOrder.deliveryInfo.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Delivered Date
                  </Label>
                  <p className="font-medium">
                    {subOrder.deliveryInfo.deliveredAt
                      ? format(
                          new Date(subOrder.deliveryInfo.deliveredAt),
                          "PPP"
                        )
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Return Window
                  </Label>
                  <p className="font-medium">
                    {format(
                      new Date(subOrder.deliveryInfo.returnWindow),
                      "PPP"
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Days Since Return Window
                  </Label>
                  <p className="font-medium text-orange-600">
                    {subOrder.deliveryInfo.daysSinceReturnWindow} days
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Customer Confirmation
                </Label>
                <div className="mt-2 space-y-2">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-sm">
                      {subOrder.deliveryInfo.customerConfirmation.confirmed
                        ? "Customer manually confirmed delivery"
                        : "System auto-confirmed delivery"}
                    </span>
                  </div>
                  {subOrder.deliveryInfo.customerConfirmation.confirmedAt && (
                    <p className="text-sm text-muted-foreground ml-6">
                      Confirmed on{" "}
                      {format(
                        new Date(
                          subOrder.deliveryInfo.customerConfirmation.confirmedAt
                        ),
                        "PPP 'at' p"
                      )}
                    </p>
                  )}
                </div>
              </div>

              {subOrder.deliveryInfo.shippingMethod && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Shipping Method
                  </Label>
                  <div className="mt-2 p-3 bg-muted rounded-md">
                    <p className="font-medium">
                      {subOrder.deliveryInfo.shippingMethod.name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Cost:{" "}
                      {formatNaira(subOrder.deliveryInfo.shippingMethod.price)}
                    </p>
                    {subOrder.deliveryInfo.shippingMethod.description && (
                      <p className="text-sm text-muted-foreground">
                        {subOrder.deliveryInfo.shippingMethod.description}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Shipping Address
                </Label>
                <div className="mt-2 p-3 bg-muted rounded-md flex items-start space-x-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm">
                      {subOrder.orderContext.shippingAddress?.address || "N/A"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Postal Code:{" "}
                      {subOrder.orderContext.shippingAddress?.postalCode ||
                        "N/A"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2 text-soraxi-green" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Name
                </Label>
                <p className="font-medium">{subOrder.customer.name}</p>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Email
                </Label>
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm">{subOrder.customer.email}</p>
                </div>
              </div>
              {subOrder.customer.phone && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Phone
                  </Label>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <p className="text-sm">{subOrder.customer.phone}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Store Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Store className="w-5 h-5 mr-2 text-soraxi-green" />
                Store
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center overflow-hidden">
                  {subOrder.store.logo ? (
                    <Image
                      src={subOrder.store.logo || "/placeholder.svg"}
                      alt={subOrder.store.name}
                      width={48}
                      height={48}
                      className="object-cover w-full h-full"
                    />
                  ) : (
                    <Store className="w-6 h-6 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <p className="font-medium">{subOrder.store.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {subOrder.store.email}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Verification Status
                </Label>
                <div className="flex items-center space-x-2 mt-1">
                  <Shield className="w-4 h-4 text-muted-foreground" />
                  <Badge
                    variant={
                      subOrder.store.verification.isVerified
                        ? "default"
                        : "secondary"
                    }
                  >
                    {subOrder.store.verification.isVerified
                      ? "Verified"
                      : "Unverified"}
                  </Badge>
                </div>
                {subOrder.store.verification.isVerified &&
                  subOrder.store.verification.verifiedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Verified on{" "}
                      {format(
                        new Date(subOrder.store.verification.verifiedAt),
                        "PPP"
                      )}
                    </p>
                  )}
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Business Type
                </Label>
                <p className="text-sm capitalize">
                  {subOrder.store.businessInfo.type}
                </p>
                {subOrder.store.businessInfo.businessName && (
                  <p className="text-sm text-muted-foreground">
                    {subOrder.store.businessInfo.businessName}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Escrow Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2 text-soraxi-green" />
                Escrow Status
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Amount
                </Label>
                <div className="flex items-center space-x-2">
                  <p className="text-lg font-bold text-soraxi-green">
                    {formatNaira(
                      subOrder.escrowInfo.settlementDetails.totalAmount
                    )}
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-muted-foreground">
                  Status
                </Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        subOrder.escrowInfo.held
                          ? "bg-orange-500"
                          : "bg-gray-300"
                      }`}
                    />
                    <span className="text-sm">Held in Escrow</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        subOrder.escrowInfo.released
                          ? "bg-green-500"
                          : "bg-gray-300"
                      }`}
                    />
                    <span className="text-sm">Released to Seller</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        subOrder.escrowInfo.refunded
                          ? "bg-red-500"
                          : "bg-gray-300"
                      }`}
                    />
                    <span className="text-sm">Refunded to Customer</span>
                  </div>
                </div>
              </div>

              {subOrder.escrowInfo.released &&
                subOrder.escrowInfo.releasedAt && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Released Date
                    </Label>
                    <p className="text-sm">
                      {format(
                        new Date(subOrder.escrowInfo.releasedAt),
                        "PPP 'at' p"
                      )}
                    </p>
                  </div>
                )}

              {subOrder.eligibilityCheck.isEligible && (
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">
                    Eligibility
                  </Label>
                  <div className="space-y-1">
                    {subOrder.eligibilityCheck.reasons.map((reason, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <CheckCircle className="w-3 h-3 text-green-600" />
                        <span className="text-xs text-green-600">{reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Release Confirmation Dialog */}
      <Dialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              Confirm Escrow Release
            </DialogTitle>
            <DialogDescription>
              You are about to release{" "}
              {formatNaira(subOrder.escrowInfo.settlementDetails.releaseAmount)}{" "}
              to {subOrder.store.name}. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Sub-Order:</span>
                  <p className="font-medium">{subOrder.subOrderNumber}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Total Amount:</span>
                  <p className="font-medium">
                    {formatNaira(
                      subOrder.escrowInfo.settlementDetails.totalAmount
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Store:</span>
                  <p className="font-medium">{subOrder.store.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Customer:</span>
                  <p className="font-medium">{subOrder.customer.name}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Total Order Value:
                  </span>
                  <p className="font-medium">
                    {formatNaira(
                      subOrder.escrowInfo.settlementDetails.totalOrderValue
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Shipping Cost:</span>
                  <p className="font-medium">
                    {formatNaira(
                      subOrder.deliveryInfo.shippingMethod?.price || 0
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Settlement Amount:
                  </span>
                  <p className="font-medium">
                    {formatNaira(
                      subOrder.escrowInfo.settlementDetails.settleAmount
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Settlement Amount + Shipping Cost:
                  </span>
                  <p className="font-medium">
                    {formatNaira(
                      currencyOperations.add(
                        subOrder.escrowInfo.settlementDetails.settleAmount,
                        subOrder.deliveryInfo.shippingMethod?.price || 0
                      )
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Platform Commission (Seller Deduction):
                  </span>
                  <p className="font-medium">
                    {formatNaira(
                      subOrder.escrowInfo.settlementDetails.commission
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Applied Flat Fee:
                  </span>
                  <p className="font-medium">
                    {formatNaira(
                      subOrder.escrowInfo.settlementDetails.appliedFlatFee
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Applied Flat Fee:
                  </span>
                  <p className="font-medium">
                    {formatNaira(
                      subOrder.escrowInfo.settlementDetails.appliedFlatFee
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">
                    Applied Percentage Fee:
                  </span>
                  <p className="font-medium">
                    {formatNaira(
                      subOrder.escrowInfo.settlementDetails.appliedPercentageFee
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* <div>
              <Label htmlFor="release-notes">Release Notes (Optional)</Label>
              <Textarea
                id="release-notes"
                placeholder="Add any notes about this escrow release..."
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                className="mt-3"
              />
            </div> */}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowReleaseDialog(false)}
              disabled={releasing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleReleaseEscrow}
              disabled={releasing}
              className="bg-soraxi-green hover:bg-soraxi-green/90 text-white"
            >
              {releasing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Releasing...
                </>
              ) : (
                <>Release Funds</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAdminAuth(EscrowReleaseDetail, {
  requiredPermissions: [PERMISSIONS.PROCESS_ESCROW],
});
