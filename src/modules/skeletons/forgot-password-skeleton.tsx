import { Skeleton } from "@/components/ui/skeleton";

export function ForgotPasswordSkeleton() {
  return (
    <main className="bg-white dark:bg-[#1D1D1D] text-gray-900 dark:text-gray-100 min-h-screen flex flex-row justify-center items-center">
      <section className="max-w-3xl mx-auto my-5 px-6 w-full">
        <div className="w-full max-w-sm mx-auto overflow-hidden bg-white rounded-lg shadow-md dark:bg-gray-800">
          <div className="px-6 py-4 space-y-6">
            {/* Logo */}
            <div className="flex justify-center mx-auto">
              <Skeleton className="h-8 w-32 rounded" />
            </div>

            {/* Title */}
            <Skeleton className="h-6 w-40 mx-auto" />

            {/* Subtitle */}
            <Skeleton className="h-4 w-64 mx-auto" />

            {/* Email Input */}
            <div className="space-y-2 pt-4">
              <Skeleton className="h-10 w-full rounded-md" />
            </div>

            {/* Button */}
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        </div>
      </section>
    </main>
  );
}
