"use client";

import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function EditRequestSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-2xl mx-auto py-8 px-6 md:px-8 space-y-6">
        {/* Back button skeleton */}
        <Skeleton className="h-10 w-32 rounded-md" />

        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-md" />
          <Skeleton className="h-4 w-48 rounded-md" />
        </div>

        {/* Card form skeleton */}
        <Card className="p-8 space-y-4 animate-pulse">
          <Skeleton className="h-6 w-32 rounded-md" /> {/* Title label */}
          <Skeleton className="h-10 w-full rounded-md" /> {/* Title input */}
          <Skeleton className="h-6 w-40 rounded-md" /> {/* Description label */}
          <Skeleton className="h-24 w-full rounded-md" />{" "}
          {/* Description textarea */}
          <Skeleton className="h-6 w-36 rounded-md" /> {/* Category label */}
          <Skeleton className="h-10 w-full rounded-md" /> {/* Category input */}
          <Skeleton className="h-6 w-36 rounded-md" /> {/* Budget label */}
          <div className="flex gap-4">
            <Skeleton className="h-10 w-24 rounded-md" /> {/* Budget min */}
            <Skeleton className="h-10 w-24 rounded-md" /> {/* Budget max */}
          </div>
          <Skeleton className="h-10 w-40 rounded-md mt-4" />{" "}
          {/* Submit button */}
        </Card>
      </div>
    </div>
  );
}
