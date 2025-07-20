import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StoreLoginSkeleton() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <Skeleton className="w-12 h-12 rounded-lg" />
          </div>
          <Skeleton className="h-6 w-1/2 mx-auto" />
          <Skeleton className="h-4 w-3/4 mx-auto" />
        </div>

        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-4 w-2/3 mt-1" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Store Email */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            {/* Forgot Password Link */}
            <Skeleton className="h-4 w-1/3 ml-auto" />

            {/* Submit Button */}
            <Skeleton className="h-10 w-full rounded-md" />
          </CardContent>
        </Card>

        <div className="text-center">
          <Skeleton className="h-4 w-1/2 mx-auto" />
        </div>
      </div>
    </div>
  );
}
