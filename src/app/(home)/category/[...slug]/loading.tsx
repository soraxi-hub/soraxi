import { Card, CardContent } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="container mx-auto px-6 py-8">
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="h-4 w-48 bg-muted animate-pulse rounded" />
          <div className="h-9 w-64 bg-muted animate-pulse rounded" />
        </div>

        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-24 bg-muted animate-pulse rounded-full" />
          ))}
        </div>

        <div className="flex gap-8">
          <div className="hidden lg:block w-64 flex-shrink-0 space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
            ))}
          </div>

          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden p-0">
                <div className="aspect-square bg-muted animate-pulse" />
                <CardContent className="p-4 space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded" />
                  <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                  <div className="h-6 bg-muted animate-pulse rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
