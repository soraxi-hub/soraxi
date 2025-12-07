import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function CouponUsageSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Coupon Details Card Skeleton */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <Skeleton className="h-8 w-1/4" />
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-6 w-2/3" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Redemption History Card Skeleton */}
      <Card>
        <CardHeader className="space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {/* Table Header Skeleton */}
            <div className="flex space-x-4 py-3 border-b">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={`header-${i}`} className="h-4 flex-1" />
              ))}
            </div>

            {/* Table Rows Skeleton */}
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex space-x-4 py-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="flex-1 h-4" />
                <Skeleton className="flex-1 h-4" />
                <Skeleton className="flex-1 h-6 w-16" />
                <Skeleton className="flex-1 h-4" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
