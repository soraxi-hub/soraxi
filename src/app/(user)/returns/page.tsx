"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Package, Search, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { ReturnRequestDialog } from "@/components/returns/ReturnRequestDialog";
import { ProductReturnCard } from "@/components/returns/ProductReturnCard";
import { ReturnStatusTimeline } from "@/components/returns/ReturnStatusTimeline";

interface ReturnItem {
  _id: string;
  userId: string;
  productId: string;
  quantity: number;
  reason: string;
  status:
    | "Requested"
    | "Approved"
    | "Rejected"
    | "In-Transit"
    | "Received"
    | "Refunded";
  requestedAt: string;
  approvedAt?: string;
  refundAmount: number;
  returnShippingCost?: number;
}

interface StatusHistoryItem {
  status: string;
  timestamp: string;
  notes?: string;
}

interface Product {
  _id: string;
  name: string;
  images: string[];
  price: number;
}

interface OrderProduct {
  Product: Product;
  quantity: number;
  price: number;
  selectedSize?: {
    size: string;
    price: number;
  };
}

interface ReturnData {
  orderId: string;
  subOrderId: string;
  returns: ReturnItem[];
  returnWindow: string;
  deliveryStatus: string;
  canReturn: boolean;
  products: OrderProduct[];
  statusHistory?: StatusHistoryItem[];
}

export default function ReturnsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get("orderId") || "");
  const [subOrderId, setSubOrderId] = useState(
    searchParams.get("subOrderId") || ""
  );
  const [returnData, setReturnData] = useState<ReturnData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showReturnDialog, setShowReturnDialog] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<OrderProduct | null>(
    null
  );

  const handleSearch = async () => {
    if (!orderId || !subOrderId) {
      toast.error("Please enter both Order ID and Sub-Order ID");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `/api/returns?orderId=${orderId}&subOrderId=${subOrderId}`
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to fetch return information");
      }

      if (result.success) {
        setReturnData(result.data);
        // Update URL with search params
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.set("orderId", orderId);
        newUrl.searchParams.set("subOrderId", subOrderId);
        router.replace(newUrl.toString());
      } else {
        throw new Error(result.error || "No return data found");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "An error occurred";
      setError(errorMessage);
      toast.error(errorMessage);
      setReturnData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestReturn = (product: OrderProduct) => {
    setSelectedProduct(product);
    setShowReturnDialog(true);
  };

  const handleReturnSubmitted = () => {
    // Refresh the data after a return is submitted
    handleSearch();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-NG", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getProductReturnStatus = (
    productId: string
  ): ReturnItem | undefined => {
    return returnData?.returns.find((r) => r.productId === productId);
  };

  const canReturnProduct = (productId: string): boolean => {
    if (!returnData?.canReturn) return false;

    // Check if product already has a return request
    const existingReturn = getProductReturnStatus(productId);
    return !existingReturn;
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Return Status
              </h1>
              <p className="text-muted-foreground">
                Track your return requests and initiate new returns
              </p>
            </div>
          </div>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Search className="h-5 w-5" />
              <span>Find Your Order</span>
            </CardTitle>
            <CardDescription>
              Enter your Order ID and Sub-Order ID to view return information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="orderId">Order ID</Label>
                <Input
                  id="orderId"
                  placeholder="Enter your order ID"
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  variant={"primary"}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subOrderId">Sub-Order ID</Label>
                <Input
                  id="subOrderId"
                  placeholder="Enter your sub-order ID"
                  value={subOrderId}
                  onChange={(e) => setSubOrderId(e.target.value)}
                />
              </div>
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || !orderId || !subOrderId}
              className="w-full md:w-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search Returns
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert className="mb-6 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Return Data Display */}
        {returnData && (
          <div className="space-y-6">
            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Order Information</CardTitle>
                <CardDescription>
                  Order ID: {returnData.orderId} | Sub-Order ID:{" "}
                  {returnData.subOrderId}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Delivery Status
                    </p>
                    <Badge variant="outline" className="mt-1">
                      {returnData.deliveryStatus}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Return Window
                    </p>
                    <p className="text-sm mt-1">
                      Until {formatDate(returnData.returnWindow)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      Can Return
                    </p>
                    <Badge
                      variant={returnData.canReturn ? "default" : "secondary"}
                      className="mt-1"
                    >
                      {returnData.canReturn ? "Yes" : "No"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Products with Return Options */}
            <Card>
              <CardHeader>
                <CardTitle>Products in This Order</CardTitle>
                <CardDescription>
                  {returnData.canReturn
                    ? "Click 'Return' to initiate a return request for any product"
                    : "Return window has expired or delivery not confirmed"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {returnData.products.map((product, index) => (
                    <ProductReturnCard
                      key={`${product.Product._id}-${index}`}
                      product={product}
                      existingReturn={getProductReturnStatus(
                        product.Product._id
                      )}
                      canReturn={canReturnProduct(product.Product._id)}
                      onRequestReturn={handleRequestReturn}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Return Requests Summary */}
            {returnData.returns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Return Requests Summary</CardTitle>
                  <CardDescription>
                    {returnData.returns.length} return request(s) found
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-primary">
                        {
                          returnData.returns.filter(
                            (r) => r.status === "Requested"
                          ).length
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {
                          returnData.returns.filter(
                            (r) => r.status === "Approved"
                          ).length
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">Approved</p>
                    </div>
                    <div className="text-center p-4 bg-muted/50 rounded-lg">
                      <p className="text-2xl font-bold text-green-700">
                        {
                          returnData.returns.filter(
                            (r) => r.status === "Refunded"
                          ).length
                        }
                      </p>
                      <p className="text-sm text-muted-foreground">Refunded</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Status History */}
            {returnData.statusHistory &&
              returnData.statusHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Status History</CardTitle>
                    <CardDescription>
                      Complete timeline of order and return status changes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ReturnStatusTimeline
                      statusHistory={returnData.statusHistory}
                    />
                  </CardContent>
                </Card>
              )}
          </div>
        )}

        {/* Help Section */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              If you have questions about your return or need assistance, please
              contact our support team.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={() => router.push("/help")}>
                Visit Help Center
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/help#contact")}
              >
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Return Request Dialog */}
        <ReturnRequestDialog
          open={showReturnDialog}
          setOpen={setShowReturnDialog}
          product={selectedProduct}
          orderId={orderId}
          subOrderId={subOrderId}
          onReturnSubmitted={handleReturnSubmitted}
        />
      </div>
    </div>
  );
}
