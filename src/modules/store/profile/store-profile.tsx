"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Package, Share2 } from "lucide-react";
import StoreDescription from "./store-description";

import { useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { ProductCard } from "@/modules/products/product-detail/product-card";

export default function StoreProfile() {
  const [isCopied, setIsCopied] = useState(false);
  // console.log("id", id);

  const trpc = useTRPC();
  const {
    data: store,
    isLoading,
    refetch: refetchData,
  } = useSuspenseQuery(trpc.storeProfile.getStoreProfilePrivate.queryOptions());

  const refetchDataHandler = () => {
    refetchData();
  };

  const storeData = {
    name: store?.name || "",
    description: store?.description || "",
    createdAt: store?.createdAt as unknown as Date,
    uniqueId: store?.uniqueId || "",
  };

  const handleShareStore = () => {
    if (!store?.uniqueId) return;

    const storeUrl = `${window.location.origin}/brand/${store._id}`;
    navigator.clipboard.writeText(storeUrl);
    setIsCopied(true);
    toast.success(`Store link copied to clipboard!`);

    setTimeout(() => setIsCopied(false), 2000);
  };

  const { name, description, products, uniqueId, followers } = store;

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

              {/* Share Button */}
              <Button
                variant="outline"
                onClick={handleShareStore}
                className="sm:mb-4 gap-2 w-full sm:w-auto"
              >
                <Share2 className="h-4 w-4" />
                <span className="sr-only sm:not-sr-only">
                  {isCopied ? "Copied!" : "Share Store"}
                </span>
              </Button>
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
              {products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-24 h-24 rounded-full flex justify-center items-center bg-soraxi-green/10">
                    <Package className="h-12 w-12 text-soraxi-green" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2 mt-8">
                    You haven’t added any products yet
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-md">
                    Start building your store by uploading your first product.
                    Products you add will appear here and be visible to your
                    customers.
                  </p>
                  <Button
                    asChild
                    className="bg-soraxi-green hover:bg-soraxi-green-hover text-white"
                  >
                    <Link href={`/store/${store._id}/products/upload`}>
                      Add Your First Product
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="description" className="mt-6">
          <StoreDescription
            storeData={storeData}
            loading={isLoading}
            refetchDataHandlerAction={refetchDataHandler}
          />
        </TabsContent>
      </Tabs>
    </main>
  );
}
