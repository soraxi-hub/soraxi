import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export default function RequestDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-4xl mx-auto py-8 px-6 md:px-8">
        {/* Back Button */}
        <Skeleton className="h-9 w-40 mb-6 rounded-md" />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header Card */}
            <Card className="p-8 border">
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    {/* Title */}
                    <Skeleton className="h-10 w-80" />

                    {/* Status badge */}
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>
                </div>

                {/* Meta Information */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-5 w-32" />
                </div>
              </div>
            </Card>

            {/* Description */}
            <Card className="p-6 space-y-4">
              <Skeleton className="h-6 w-32" />

              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[85%]" />
              </div>

              {/* Categories */}
              <div className="pt-4 border-t border-border">
                <Skeleton className="h-4 w-24 mb-3" />
                <div className="flex flex-wrap gap-2">
                  <Skeleton className="h-6 w-20 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6 sticky top-4 space-y-4">
              <Skeleton className="h-6 w-40" />

              <div className="space-y-3">
                <div>
                  <Skeleton className="h-3 w-16 mb-2" />
                  <Skeleton className="h-8 w-28" />
                </div>

                <div className="pt-3 border-t border-border">
                  <Skeleton className="h-3 w-12 mb-2" />
                  <Skeleton className="h-6 w-20 rounded-full" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
