import { Skeleton } from "@/components/ui/skeleton";

export const WishlistSkeleton = () => (
  <div className="py-8">
    <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:col-span-3 lg:gap-x-8">
      {[...Array(6)].map((_, i) => (
        <Skeleton key={i} className="h-[300px] w-full rounded-lg" />
      ))}
    </div>
  </div>
);
