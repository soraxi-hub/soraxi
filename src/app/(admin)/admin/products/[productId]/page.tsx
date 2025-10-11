"use client";

import { use } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useTRPC } from "@/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ProductDetailManagement } from "@/modules/admin/products/product-detail-management";

interface PageProps {
  params: Promise<{
    productId: string;
  }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const trpc = useTRPC();

  const {
    data: product,
    isLoading,
    refetch,
  } = useSuspenseQuery(
    trpc.admin.getById.queryOptions({
      productId: resolvedParams.productId,
    })
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-[300px]" />
            <Skeleton className="h-4 w-[200px]" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <ProductDetailManagement product={product} refetchAction={refetch} />
    </div>
  );
}
