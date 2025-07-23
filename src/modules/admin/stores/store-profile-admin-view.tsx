"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Package } from "lucide-react";
import StoreDescriptionAdminView from "./store-description-admin-view";
import Link from "next/link";
import { ProductCard } from "@/modules/products/product-detail/product-card";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/trpc/routers/_app";

/**
 * Type definitions for checkout data structures
 */
type StoreDataOutput = inferProcedureOutput<
  AppRouter["adminStore"]["getStoreProfileAdminView"]
>;

export default function StoreProfileAdminView({
  storeData,
}: {
  storeData: StoreDataOutput;
}) {
  if (!storeData) {
    return (
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
  }

  const { name, description, products, uniqueId, followers } = storeData;

  return (
    <main className="container mx-auto px-4 md:px-8 py-6">
      {/* Store Header */}
      <Card className="mb-6">
        <CardContent className="p-0">
          <div className="relative h-48 bg-muted/50 rounded-t-lg">
            <div className="absolute -bottom-8 left-0 right-0 sm:left-6 px-4 flex flex-col sm:flex-row items-start sm:items-end gap-4">
              {/* Store Info Container */}
              <div className="bg-background p-4 rounded-lg shadow-lg w-full max-w-full sm:flex-1 sm:max-w-fit sm:min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                  <h1 className="text-2xl sm:text-3xl font-bold truncate break-words">
                    {name}
                  </h1>
                  <Badge variant="outline" className="text-xs sm:text-sm w-fit">
                    ID: {uniqueId}
                  </Badge>
                </div>

                {/* Stats Container */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 mt-4">
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span className="text-sm sm:text-base font-medium">
                      {followers?.length.toLocaleString()} Follower
                      {(followers.length > 1 || followers.length === 0) && "s"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Package className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" />
                    <span className="text-sm sm:text-base font-medium">
                      {products?.length.toLocaleString()} Products
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-20 px-6 pb-6">
            <div className="prose dark:prose-invert max-w-4xl">
              {description}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Store Content Tabs */}
      <Tabs defaultValue="products" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="products" className="flex gap-2">
            <Package className="h-4 w-4" /> Products
          </TabsTrigger>
          <TabsTrigger value="description" className="flex gap-2">
            <Users className="h-4 w-4" /> About
          </TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Product Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`}
              >
                {products.map((product) => (
                  <Link key={product._id} href={`/products/${product.slug}`}>
                    <ProductCard
                      product={{
                        ...product,
                        id: product._id,
                      }}
                    />
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="description" className="mt-6">
          <StoreDescriptionAdminView storeData={storeData} />
        </TabsContent>
      </Tabs>
    </main>
  );
}
