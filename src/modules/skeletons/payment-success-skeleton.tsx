"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function PaymentSuccessSkeleton() {
  return (
    <main className="grid min-h-full place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center space-y-6 w-full max-w-md">
        <Skeleton className="mx-auto h-10 w-10 rounded-full bg-muted" />

        <Skeleton className="h-10 w-3/4 mx-auto bg-muted" />
        <Skeleton className="h-6 w-2/3 mx-auto bg-muted" />

        <Skeleton className="h-6 w-1/2 mx-auto bg-muted" />

        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Skeleton className="h-10 w-32 rounded-md bg-muted" />
          <Skeleton className="h-6 w-28 rounded bg-muted" />
        </div>
      </div>
    </main>
  );
}
