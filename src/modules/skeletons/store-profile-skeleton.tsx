import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const StoreProfileSkeleton = () => (
  <div className="p-8 space-y-6">
    <Skeleton className="h-[200px] w-full rounded-xl" />
    <div className="space-y-4">
      <Skeleton className="h-10 w-[300px]" />
      <Skeleton className="h-6 w-[200px]" />
      <div className="flex gap-4">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
    <Tabs defaultValue="products">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="products">
          <Skeleton className="h-6 w-24" />
        </TabsTrigger>
        <TabsTrigger value="description">
          <Skeleton className="h-6 w-24" />
        </TabsTrigger>
      </TabsList>
    </Tabs>
  </div>
);
