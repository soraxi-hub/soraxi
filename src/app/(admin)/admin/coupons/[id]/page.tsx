import { Suspense } from "react";
import { caller } from "@/trpc/server";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "@/components/errors/error-fallback";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { currencyOperations, formatNaira } from "@/lib/utils/naira";
import { CouponUsageSkeleton } from "@/modules/skeletons/coupon-usage-skeleton";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page({ params }: PageProps) {
  const { id } = await params;

  const couponData = await caller.adminCoupon.getCouponUsage({ couponId: id });

  const coupon = couponData.coupon;

  const formatDate = (date: Date) =>
    format(new Date(date), "MMM dd, yyyy HH:mm");

  return (
    <div className="container mx-auto py-8 space-y-6">
      <ErrorBoundary fallback={<ErrorFallback />}>
        <Suspense fallback={<CouponUsageSkeleton />}>
          {/* Coupon Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-2xl flex flex-col gap-1.5 justify-between sm:flex-row">
                <p>Coupon Usage: {coupon.code ?? "-"}</p>
                <p>
                  Type:{" "}
                  {`${coupon.type.charAt(0).toUpperCase()}` +
                    coupon.type.slice(1)}
                </p>
              </CardTitle>
              <CardDescription>
                View redemption history for this coupon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 items-center justify-between">
                <div className="flex gap-1.5 items-center">
                  <p className="text-sm text-muted-foreground">
                    Total Redemptions:
                  </p>
                  <p className="text-2xl font-bold">
                    {coupon.totalRedemptions || 0}
                  </p>
                </div>
                <div className="flex gap-1.5 items-center">
                  <p className="text-sm text-muted-foreground">Max Allowed:</p>
                  <p className="text-2xl font-bold">
                    {coupon.maxRedemptions || "Unlimited"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Redemption History */}
          <Card>
            <CardHeader>
              <CardTitle>Redemption History</CardTitle>
              <p className="text-sm text-gray-500">
                Showing {couponData.redemptions.length} of{" "}
                {coupon.maxRedemptions || "Unlimited"} redemptions
              </p>
            </CardHeader>
            <CardContent>
              {couponData.redemptions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Order Total</TableHead>
                      <TableHead>Discount Applied</TableHead>
                      <TableHead>Original Total</TableHead>
                      <TableHead>Redeemed At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {couponData.redemptions.map((redemption) => (
                      <TableRow key={redemption._id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {redemption.userId.firstName}{" "}
                              {redemption.userId.lastName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {redemption.userId._id.substring(0, 8)}...
                            </p>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="font-mono text-sm">
                            {redemption.orderId._id.substring(0, 8)}...
                          </div>
                        </TableCell>

                        <TableCell>
                          {formatNaira(redemption.orderId.totalAmount)}
                        </TableCell>

                        <TableCell>
                          {formatNaira(redemption.orderId.discount.amount)}
                        </TableCell>

                        <TableCell>
                          {formatNaira(
                            currencyOperations.add(
                              redemption.orderId.totalAmount,
                              redemption.orderId.discount.amount
                            )
                          )}
                        </TableCell>

                        <TableCell>
                          {formatDate(redemption.redeemedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No redemptions found for this coupon.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
