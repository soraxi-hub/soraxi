import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function RequestCardSkeleton() {
  return (
    <Card className="overflow-hidden border-l-4 border-l-transparent animate-pulse">
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            {/* Title */}
            <Skeleton className="h-5 w-3/4 rounded-md" />
            {/* Description */}
            <Skeleton className="h-4 w-full max-w-[90%] rounded-md" />
          </div>
          {/* Status badge */}
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
