"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface CouponUsageDialogProps {
  coupon: any;
  open: boolean;
  onOpenChangeAction: (open: boolean) => void;
}

export function CouponUsageDialog({
  coupon,
  open,
  onOpenChangeAction,
}: CouponUsageDialogProps) {
  const [page, setPage] = useState(1);
  const trpc = useTRPC();

  const { data: usageData, isLoading } = useQuery(
    trpc.adminCoupon.getCouponUsage.queryOptions({
      couponId: coupon._id,
      page,
      limit: 10,
    })
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Coupon Usage: {coupon.code}</DialogTitle>
          <DialogDescription>
            View redemption history for this coupon
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Total Redemptions
                  </p>
                  <p className="text-2xl font-bold">
                    {usageData?.coupon?.totalRedemptions || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Max Allowed</p>
                  <p className="text-2xl font-bold">
                    {usageData?.coupon?.maxRedemptions || "Unlimited"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Redemptions Table */}
          {isLoading ? (
            <div className="text-center py-8">Loading...</div>
          ) : usageData?.redemptions?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No redemptions yet
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Redeemed At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageData?.redemptions?.map((redemption: any) => (
                      <TableRow key={redemption._id}>
                        <TableCell className="font-mono text-sm">
                          {redemption.userId}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {redemption.orderId}
                        </TableCell>
                        <TableCell>
                          {format(
                            new Date(redemption.redeemedAt),
                            "MMM dd, yyyy HH:mm"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Page {page} of {usageData?.pagination?.pages}
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
                        Math.min(usageData?.pagination?.pages || 1, page + 1)
                      )
                    }
                    disabled={page === usageData?.pagination?.pages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
