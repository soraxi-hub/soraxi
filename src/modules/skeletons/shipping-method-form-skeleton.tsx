import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ShippingMethodFormSkeleton() {
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Skeleton for Existing Methods Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center justify-between">
            <Skeleton className="h-6 w-40" />
            <Badge variant="outline">
              <Skeleton className="h-4 w-10" />
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
                <Skeleton className="h-8 w-full" />
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Skeleton for Add/Edit Form Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">
            <Skeleton className="h-6 w-60" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-10 w-32" />
            </div>

            <Skeleton className="h-24 w-full" />

            <div className="bg-soraxi-green/5 border border-soraxi-green/20 rounded-lg p-4 space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>

            <div className="flex gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
