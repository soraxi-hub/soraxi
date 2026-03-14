import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function RequestRowSkeleton() {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title */}
          <Skeleton className="h-5 w-64" />

          {/* Description */}
          <Skeleton className="h-4 w-full max-w-md" />

          {/* Badges */}
          <div className="flex gap-2 pt-1">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-24 rounded-full" />
          </div>
        </div>

        {/* Right side meta */}
        <div className="flex flex-col items-end gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      </div>
    </Card>
  );
}

export default function UserRequestsSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="container py-8 px-6 md:px-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>

          <Skeleton className="h-10 w-36 rounded-md" />
        </div>

        {/* Tabs */}
        <div className="space-y-6">
          <Skeleton className="h-10 w-64 rounded-md" />

          {/* Request rows */}
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <RequestRowSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
