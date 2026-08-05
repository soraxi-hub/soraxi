import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading state for the public storefront.
 *
 * Mirrors the real layout's breakpoints exactly — identity card then products
 * on mobile, two columns from `lg` — so hydration swaps content in without the
 * page jumping.
 */
export function PublicStoreProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Breadcrumb */}
        <Skeleton className="mb-6 hidden h-4 w-56 sm:block" />

        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-8">
          {/* Identity card */}
          <Card>
            <CardContent className="space-y-6 px-4 sm:px-6">
              <div className="flex items-start gap-4">
                <Skeleton className="size-14 shrink-0 rounded-full sm:size-16" />
                <Skeleton className="h-8 w-40" />
              </div>

              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-5 w-48" />

              <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>

              <div className="space-y-2">
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </div>
            </CardContent>
          </Card>

          {/* Products panel */}
          <section className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-2">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <Skeleton className="h-9 w-full sm:w-56" />
                <Skeleton className="h-9 w-full sm:w-44" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="gap-2 p-0">
                  <Skeleton className="h-48 w-full rounded-b-none" />
                  <CardContent className="space-y-2 p-4 pt-0">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-6 w-24" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
