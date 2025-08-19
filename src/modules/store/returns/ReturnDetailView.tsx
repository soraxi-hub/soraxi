"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Package,
  User,
  Calendar,
  DollarSign,
  MessageSquare,
  CheckCircle,
  XCircle,
  RefreshCw,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

interface ReturnDetail {
  _id: string;
  orderId: string;
  subOrderId: string;
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  product: {
    _id: string;
    name: string;
    images: string[];
    price: number;
  };
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
  images?: string[];
  statusHistory: Array<{
    status: string;
    timestamp: string;
    notes?: string;
  }>;
}

interface ReturnDetailViewProps {
  storeId: string;
  returnId: string;
}

const statusColors = {
  Requested: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Approved: "bg-green-100 text-green-800 border-green-200",
  Rejected: "bg-red-100 text-red-800 border-red-200",
  "In-Transit": "bg-blue-100 text-blue-800 border-blue-200",
  Received: "bg-purple-100 text-purple-800 border-purple-200",
  Refunded: "bg-emerald-100 text-emerald-800 border-emerald-200",
};

export function ReturnDetailView({ storeId, returnId }: ReturnDetailViewProps) {
  const [returnDetail, setReturnDetail] = useState<ReturnDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const fetchReturnDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/store/returns/${returnId}?storeId=${storeId}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch return details");
      }

      const data = await response.json();
      console.log("Fetched return details:", data.return);
      setReturnDetail(data.return);
    } catch (error) {
      console.error("Error fetching return details:", error);
      toast.error("Failed to load return details");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!returnDetail) return;

    try {
      setActionLoading(true);
      const response = await fetch(`/api/store/returns/${returnId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          storeId,
          status: newStatus,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update return status");
      }

      toast.success(`Return ${newStatus.toLowerCase()} successfully`);
      setNotes("");
      fetchReturnDetail(); // Refresh data
    } catch (error) {
      console.error("Error updating return status:", error);
      toast.error("Failed to update return status");
    } finally {
      setActionLoading(false);
    }
  };

  useEffect(() => {
    fetchReturnDetail();
  }, [returnId, storeId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!returnDetail) {
    return (
      <div className="text-center py-8">
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500">Return not found</p>
      </div>
    );
  }

  const canApprove = returnDetail.status === "Requested";
  const canMarkReceived = returnDetail.status === "In-Transit";
  const canRefund = returnDetail.status === "Received";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href={`/store/${storeId}/returns`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Returns
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Return Request</h1>
            <p className="text-gray-600">ID: {returnDetail._id}</p>
          </div>
        </div>
        <Badge className={statusColors[returnDetail.status]}>
          {returnDetail.status}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4">
                <Avatar className="h-12 w-12">
                  <AvatarFallback>
                    {returnDetail.user.firstName[0]}
                    {returnDetail.user.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold">
                    {returnDetail.user.firstName} {returnDetail.user.lastName}
                  </p>
                  <p className="text-gray-600">{returnDetail.user.email}</p>
                  <p className="text-sm text-gray-500">
                    Order ID: {returnDetail.orderId}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start space-x-4">
                <Image
                  src={returnDetail.product.images[0] || "/placeholder.svg"}
                  alt={returnDetail.product.name}
                  width={80}
                  height={80}
                  className="rounded-lg object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">
                    {returnDetail.product.name}
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <p className="text-sm text-gray-600">Quantity</p>
                      <p className="font-medium">
                        {returnDetail.quantity} items
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Unit Price</p>
                      <p className="font-medium">
                        ₦{(returnDetail.product.price / 100).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Refund Amount</p>
                      <p className="font-medium text-green-600">
                        ₦{(returnDetail.refundAmount / 100).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Return Reason</p>
                      <p className="font-medium">{returnDetail.reason}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Return Images */}
          {returnDetail.images && returnDetail.images.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5" />
                  Customer Uploaded Images
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {returnDetail.images.map((image, index) => (
                    <Image
                      key={index}
                      src={image || "/placeholder.svg"}
                      alt={`Return evidence ${index + 1}`}
                      width={200}
                      height={200}
                      className="rounded-lg object-cover cursor-pointer hover:opacity-80"
                      onClick={() => window.open(image, "_blank")}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          {(canApprove || canMarkReceived || canRefund) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Take Action
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Notes (Optional)
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this action..."
                    className="mt-1"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {canApprove && (
                    <>
                      <Button
                        onClick={() => handleStatusUpdate("Approved")}
                        disabled={actionLoading}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Approve Return
                      </Button>
                      <Button
                        onClick={() => handleStatusUpdate("Rejected")}
                        disabled={actionLoading}
                        variant="destructive"
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Reject Return
                      </Button>
                    </>
                  )}
                  {canMarkReceived && (
                    <Button
                      onClick={() => handleStatusUpdate("Received")}
                      disabled={actionLoading}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Mark as Received
                    </Button>
                  )}
                  {canRefund && (
                    <Button
                      onClick={() => handleStatusUpdate("Refunded")}
                      disabled={actionLoading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Process Refund
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Return Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Return Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {returnDetail.statusHistory.map((entry, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <p className="font-medium">{entry.status}</p>
                      <p className="text-sm text-gray-600">
                        {formatDistanceToNow(new Date(entry.timestamp), {
                          addSuffix: true,
                        })}
                      </p>
                      {entry.notes && (
                        <p className="text-sm text-gray-500 mt-1">
                          {entry.notes}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Return Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Requested</span>
                <span className="font-medium">
                  {formatDistanceToNow(new Date(returnDetail.requestedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {returnDetail.approvedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Approved</span>
                  <span className="font-medium">
                    {formatDistanceToNow(new Date(returnDetail.approvedAt), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between">
                <span className="text-gray-600">Refund Amount</span>
                <span className="font-medium text-green-600">
                  ₦{(returnDetail.refundAmount / 100).toLocaleString()}
                </span>
              </div>
              {returnDetail.returnShippingCost && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Shipping Cost</span>
                  <span className="font-medium">
                    ₦{(returnDetail.returnShippingCost / 100).toLocaleString()}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
