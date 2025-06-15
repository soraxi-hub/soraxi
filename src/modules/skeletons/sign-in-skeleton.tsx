import { Skeleton } from "@/components/ui/skeleton";

export default function SignInSkeleton() {
  return (
    <main className="min-h-screen bg-background">
      <div className="flex justify-center h-screen">
        <div className="hidden bg-cover md:block md:w-2/4">
          <Skeleton className="w-full h-full" />
        </div>

        <div className="flex items-center w-full max-w-md px-6 mx-auto lg:w-2/6">
          <div className="flex-1 space-y-6">
            <div className="text-center">
              <Skeleton className="mx-auto h-8 w-32" />
              <Skeleton className="mx-auto mt-4 h-6 w-48" />
              <Skeleton className="mx-auto mt-2 h-4 w-40" />
            </div>

            <div className="space-y-4 mt-10">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-4 w-24 mt-4" />
              <Skeleton className="h-10 w-full" />

              <div className="flex items-center justify-between mt-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-24" />
              </div>

              <div className="flex items-center justify-center pt-6 space-x-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
