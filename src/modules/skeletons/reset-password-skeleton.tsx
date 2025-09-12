import { Skeleton } from "@/components/ui/skeleton";

export function ResetPasswordSkeleton() {
  return (
    <main className="min-h-screen flex justify-center items-center bg-background">
      <section className="w-full">
        <div className="w-full max-w-sm mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md px-6 py-4">
          {/* Title */}
          <Skeleton className="h-6 w-40 mx-auto mt-2" />
          <Skeleton className="h-4 w-60 mx-auto mt-3" />

          {/* Form */}
          <div className="space-y-6 mt-6">
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            <div>
              <Skeleton className="h-4 w-36 mb-2" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            <div className="flex items-center space-x-3">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-32" />
            </div>

            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </section>
    </main>
  );
}
