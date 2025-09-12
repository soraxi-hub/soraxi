import { Skeleton } from "@/components/ui/skeleton";

export default function SignUpSkeleton() {
  return (
    <main className="min-h-screen bg-background transition-colors duration-300">
      <section className="flex flex-col lg:flex-row lg:min-h-screen">
        {/* Sidebar steps */}
        <div className="hidden lg:flex flex-col items-center justify-center w-full max-w-[180px] py-12 px-4 bg-muted/40 border-r-2">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex flex-col items-center">
              <Skeleton className="w-8 h-8 rounded-full mb-2" />
              <Skeleton className="h-3 w-16 mb-4" />
              {step < 3 && <Skeleton className="w-1 h-8 mb-4" />}
            </div>
          ))}
        </div>

        {/* Form area */}
        <div className="w-full px-4 lg:px-8 py-10 lg:w-3/4 mx-auto">
          {/* Logo */}
          <Skeleton className="h-6 w-32 mx-auto mb-6" />

          {/* Subtitle */}
          <Skeleton className="h-4 w-64 mx-auto mb-6" />

          <div className="max-w-2xl mx-auto">
            {/* Step title */}
            <Skeleton className="h-5 w-40 mx-auto mb-6" />

            {/* Form fields */}
            <div className="space-y-6">
              {[1, 2, 3].map((row) => (
                <Skeleton key={row} className="h-10 w-full rounded-md" />
              ))}
            </div>

            {/* Progress / password strength */}
            <div className="mt-6">
              <Skeleton className="h-3 w-full rounded-md" />
              <div className="space-y-2 mt-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-3 w-40" />
                ))}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-between items-center mt-8 gap-4">
              <Skeleton className="h-10 w-32 rounded-md" />
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>

            {/* Sign-in link */}
            <div className="text-center mt-6">
              <Skeleton className="h-4 w-56 mx-auto" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
