"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Edit, Trash2, Eye } from "lucide-react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { CouponForm } from "./coupon-form";
import { CouponUsageDialog } from "./coupon-usage-dialog";
import { CouponAdminManager } from "@/domain/coupons/coupon-admin-manager";

export function CouponManagement() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<
    "all" | "active" | "inactive" | "expired"
  >("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUsageOpen, setIsUsageOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState<any>(null);

  const trpc = useTRPC();

  const {
    data: couponsData,
    isLoading,
    refetch,
  } = useQuery(
    trpc.adminCoupon.listCoupons.queryOptions({
      page,
      limit: 20,
      search: search || undefined,
      status: status !== "all" ? status : undefined,
    })
  );

  const deleteMutation = useMutation(
    trpc.adminCoupon.deleteCoupon.mutationOptions({
      onSuccess: () => {
        toast.success("Coupon deleted successfully");
        refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete coupon");
      },
    })
  );

  const handleDelete = (couponId: string) => {
    if (confirm("Are you sure you want to delete this coupon?")) {
      deleteMutation.mutate({ couponId });
    }
  };

  const handleEdit = (coupon: any) => {
    setSelectedCoupon(coupon);
    setIsEditOpen(true);
  };

  const handleViewUsage = (coupon: any) => {
    setSelectedCoupon(coupon);
    setIsUsageOpen(true);
  };

  const getStatusBadge = (coupon: any) => {
    const manager = new CouponAdminManager(coupon);
    const badge = manager.getStatusBadge();

    const variants: Record<string, any> = {
      success: "bg-green-100 text-green-800",
      destructive: "bg-red-100 text-red-800",
      secondary: "bg-gray-100 text-gray-800",
    };

    return (
      <Badge className={variants[badge.variant] || variants.secondary}>
        {badge.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Coupons</h1>
          <p className="text-muted-foreground">Manage promotional coupons</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Coupon
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search by coupon code..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full"
              />
            </div>
            <Select
              value={status}
              onValueChange={(value: any) => {
                setStatus(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Coupons Table */}
      <Card>
        <CardHeader>
          <CardTitle>Coupons List</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : couponsData?.coupons?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No coupons found
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Max Uses</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {couponsData?.coupons?.map((coupon: any) => (
                      <TableRow key={coupon._id}>
                        <TableCell className="font-mono font-semibold">
                          {coupon.code}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {coupon.type === "percentage" ? "%" : "₦"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {coupon.type === "percentage"
                            ? `${coupon.value}%`
                            : `₦${coupon.value}`}
                        </TableCell>
                        <TableCell>{getStatusBadge(coupon)}</TableCell>
                        <TableCell className="text-sm">
                          {new Date(coupon.endDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {coupon.maxRedemptions || "Unlimited"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewUsage(coupon)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(coupon)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(coupon._id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {couponsData?.pagination?.pages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setPage(
                        Math.min(couponsData?.pagination?.pages || 1, page + 1)
                      )
                    }
                    disabled={page === couponsData?.pagination?.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={isCreateOpen || isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setIsEditOpen(false);
            setSelectedCoupon(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedCoupon ? "Edit Coupon" : "Create New Coupon"}
            </DialogTitle>
            <DialogDescription>
              {selectedCoupon
                ? "Update coupon details"
                : "Create a new promotional coupon"}
            </DialogDescription>
          </DialogHeader>
          <CouponForm
            coupon={selectedCoupon}
            onSuccessAction={() => {
              setIsCreateOpen(false);
              setIsEditOpen(false);
              setSelectedCoupon(null);
              refetch();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Usage Dialog */}
      {selectedCoupon && (
        <CouponUsageDialog
          coupon={selectedCoupon}
          open={isUsageOpen}
          onOpenChangeAction={setIsUsageOpen}
        />
      )}
    </div>
  );
}
