import { Skeleton } from "@/components/ui/skeleton";

export function UserSecuritySkeleton() {
  return (
    <div className="max-w-lg mx-auto py-10 px-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Skeleton className="h-6 w-6 rounded-full" />
        <div>
          <Skeleton className="h-6 w-40 mb-1" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      {/* Form fields */}
      <div className="space-y-5">
        {/* Current Password */}
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <div className="relative">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="absolute right-3 top-3 h-5 w-5" />
          </div>
        </div>

        {/* New Password */}
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <div className="relative">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="absolute right-3 top-3 h-5 w-5" />
          </div>
          {/* Password strength indicator skeleton */}
          <div className="mt-2 space-y-1">
            <Skeleton className="h-2 w-full" />
            <div className="flex justify-between">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        </div>

        {/* Confirm New Password */}
        <div>
          <Skeleton className="h-4 w-32 mb-2" />
          <div className="relative">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="absolute right-3 top-3 h-5 w-5" />
          </div>
        </div>

        {/* Submit button */}
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
