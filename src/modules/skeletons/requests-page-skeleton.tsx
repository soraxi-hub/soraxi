"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

function RequestCardSkeleton() {
  return (
    <Card className="overflow-hidden border-l-4 border-l-transparent animate-pulse">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-4 w-full max-w-[90%] rounded-md" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full ml-3" />
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <Skeleton className="h-3 w-24 rounded-md" />
          <Skeleton className="h-4 w-4 rounded-full" />
        </div>
      </div>
    </Card>
  );
}

export function RequestsPageSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-6xl mx-auto py-8 space-y-8 px-6 md:px-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 rounded-md" />
            <Skeleton className="h-4 w-72 rounded-md" />
          </div>
          <Skeleton className="h-10 w-36 rounded-md" />
        </div>

        {/* Search + Filters */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Skeleton className="h-10 w-full rounded-md" />
            <Skeleton className="h-36 w-full rounded-md" />
          </div>

          <div className="lg:col-span-3 space-y-6">
            <Skeleton className="h-11 w-full rounded-md" />

            {/* Results Header */}
            <Skeleton className="h-5 w-48 rounded-md mt-2" />

            {/* Request cards skeleton */}
            <div className="space-y-3">
              {Array.from({ length: count }).map((_, i) => (
                <RequestCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
