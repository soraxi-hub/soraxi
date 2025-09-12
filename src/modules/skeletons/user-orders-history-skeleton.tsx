import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export function UserOrdersSkeleton() {
  return (
    <main className="min-h-screen w-full py-6">
      <div className="bg-background rounded-lg shadow-sm overflow-hidden">
        {/* Header Skeleton */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        <div className="divide-y divide-border">
          {/* Repeat for multiple fake orders */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="py-6 px-4 md:px-6 bg-card transition-colors"
            >
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-24 rounded-full" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>

              {/* Store Sub-orders */}
              <div className="space-y-4 mt-4">
                {Array.from({ length: 2 }).map((_, j) => (
                  <Card
                    key={j}
                    className="border border-border p-4 bg-background/50 shadow-sm"
                  >
                    <CardContent className="p-0 space-y-4">
                      <Skeleton className="h-4 w-48 mb-2" />

                      {/* Product Items */}
                      <div className="divide-y divide-border">
                        {Array.from({ length: 2 }).map((_, k) => (
                          <div
                            key={k}
                            className="flex gap-4 items-center py-3 first:pt-0"
                          >
                            <Skeleton className="w-20 h-20 sm:w-24 sm:h-24 rounded-md shrink-0" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-3/4" />
                              <Skeleton className="h-3 w-2/3" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
