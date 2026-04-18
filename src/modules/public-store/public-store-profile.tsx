"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  // Users,
  Package,
  Share2,
  Star,
  Calendar,
  Store,
  CheckCircle2,
  // Heart,
  Clock,
  AlertCircle,
  // Eye,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { truncateText } from "@/lib/utils";
import { StoreProfileManagerPublic } from "@/domain/stores/store-profile-manager-public";
import { ProductCard } from "../products/product-detail/product-card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { siteConfig } from "@/config/site";

interface PublicStoreProfileProps {
  storeId: string;
}

export function PublicStoreProfile({ storeId }: PublicStoreProfileProps) {
  // const [isCopied, setIsCopied] = useState(false);
  const [_, setIsCopied] = useState(false);
  // const [isFollowing, setIsFollowing] = useState(false);

  const trpc = useTRPC();
  const { data: store } = useSuspenseQuery(
    trpc.publicStore.getStoreProfilePublic.queryOptions({ storeId }),
  );

  const { storeStats, StoreStatusEnum } = useMemo(() => {
    const manager = new StoreProfileManagerPublic();

    if (store) {
      manager.setStoreData(store);
    }

    return {
      storeStats: manager.getStoreStats(),
      StoreStatusEnum: manager.getStoreStatus(),
    };
  }, [store]);

  const handleShareStore = () => {
    const storeUrl = `${window.location.origin}/${siteConfig.routeNames.brand}/${store._id}`;
    navigator.clipboard.writeText(storeUrl);
    setIsCopied(true);
    toast.success("Store link copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  // const handleFollowStore = () => {
  //   setIsFollowing(!isFollowing);
  //   toast.success(isFollowing ? "Unfollowed store" : "Following store!");
  // };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        {/* Store Info Overlay */}
        <Card>
          <CardContent className="p-0">
            <div className="relative h-40 bg-gradient-to-r from-muted/50 to-muted/30 rounded-t-lg">
              <div className="absolute -bottom-14 lg:-bottom-8 left-0 right-0 sm:left-6 px-4">
                <div className="bg-card border border-border p-6 rounded-lg shadow-lg dark:bg-transparent">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Store Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 group justify-between">
                        <h1 className="text-2xl lg:text-3xl font-bold truncate">
                          {store.name}
                        </h1>

                        {/* Actions Buttons*/}
                        <div className="flex gap-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                // variant="outline"
                                onClick={handleShareStore}
                                className="gap-2 bg-transparent p-0 border-0 hover:bg-transparent text-soraxi-green hover:text-soraxi-green-hover shadow-none"
                              >
                                <Share2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Share</p>
                            </TooltipContent>
                          </Tooltip>

                          {/* Follow Store: Coming Later */}
                          {/* <Button
                            onClick={handleFollowStore}
                            variant={isFollowing ? "outline" : "default"}
                            className="gap-2"
                          >
                            <Heart
                              className={`w-4 h-4 ${isFollowing ? "fill-current" : ""}`}
                            />
                            {isFollowing ? "Following" : "Follow"}
                          </Button> */}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 mb-4 overflow-hidden text-ellipsis">
                        <Badge variant="outline" className="text-sm max-w-xs">
                          ID: {truncateText(store.uniqueId, 20)}
                        </Badge>
                        <Badge
                          className={`${StoreStatusEnum.statusColor} text-white`}
                        >
                          {StoreStatusEnum.status === "active" && (
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                          )}
                          {StoreStatusEnum.status === "pending" && (
                            <Clock className="h-3 w-3 mr-1" />
                          )}
                          {StoreStatusEnum.status === "suspended" && (
                            <AlertCircle className="h-3 w-3 mr-1" />
                          )}
                          {StoreStatusEnum.statusText}
                        </Badge>
                      </div>

                      {/* Enhanced Stats */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        {/* <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground hidden sm:inline-flex" />
                          <span className="font-medium">
                            {storeStats.followersCount.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground">
                            Followers
                          </span>
                        </div> */}
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground hidden sm:inline-flex" />
                          <span className="font-medium">
                            {storeStats.productsCount.toLocaleString()}
                          </span>
                          <span className="text-muted-foreground">
                            Products
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground hidden sm:inline-flex" />
                          <span className="font-medium">
                            {storeStats.storeAge}
                          </span>
                          <span className="text-muted-foreground">Old</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground hidden sm:inline-flex" />
                          <span className="font-medium">Est.</span>
                          <span className="text-muted-foreground">
                            {storeStats.establishedDate}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="pt-16" />
          </CardContent>
        </Card>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <Tabs defaultValue="products" className="w-full">
              <TabsList className="grid grid-cols-2 w-full border-none p-0 rounded-none h-auto">
                <TabsTrigger
                  value="products"
                  className="w-full border-0 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-b-soraxi-green dark:data-[state=active]:border-b-soraxi-green py-3"
                >
                  <Package className="h-4 w-4" /> Products
                </TabsTrigger>
                <TabsTrigger
                  value="overview"
                  className="w-full border-0 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-b-soraxi-green dark:data-[state=active]:border-b-soraxi-green py-3"
                >
                  <Store className="h-4 w-4" /> Description
                </TabsTrigger>
              </TabsList>

              <TabsContent value="products" className="mt-4">
                <Card className="enhanced-card">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-2xl flex items-center gap-2">
                        Product Inventory
                      </CardTitle>
                      <Badge variant="secondary">
                        {store.products.length}{" "}
                        {store.products.length === 1 ? "item" : "items"}
                      </Badge>
                    </div>
                    {/* <p className="text-muted-foreground">
                            Manage your products and track their performance
                          </p> */}
                  </CardHeader>
                  <CardContent>
                    {store.products.length === 0 ? (
                      <div className="text-center py-12">
                        <Package className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-semibold mb-2">
                          No products yet
                        </h3>
                        <p className="text-muted-foreground">
                          This store is still setting up their product catalog.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                        {store.products.map((product) => (
                          <Link
                            key={product._id}
                            href={`/${siteConfig.routeNames.product}/${product.slug}`}
                          >
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

              <TabsContent value="overview" className="mt-4">
                <div className="">
                  {/* Store Description */}
                  <div className="lg:col-span-2">
                    <Card className="enhanced-card">
                      <CardHeader className="form-header">
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="text-xl">
                              About {store.name}
                            </CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {store.description ? (
                            <div className="prose prose-neutral dark:prose-invert max-w-none">
                              <p className="text-muted-foreground leading-relaxed text-md">
                                {store.description}
                              </p>
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                              <h3 className="text-lg font-semibold mb-2">
                                No description yet
                              </h3>
                              {/* <p className="text-muted-foreground mb-4">
                                Add a description to help customers learn about
                                your store
                              </p> */}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Store Info Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Store Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Established
                    </div>
                    <div className="font-medium">
                      {store.stats.establishedDate}
                    </div>
                  </div>
                </div>
                {/* Coming Soon */}
                {/* <Separator />
                <div className="flex items-center gap-3">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Followers
                    </div>
                    <div className="font-medium">
                      {store.stats.followersCount.toLocaleString()}
                    </div>
                  </div>
                </div> */}
                <Separator />
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <div className="text-sm text-muted-foreground">
                      Products
                    </div>
                    <div className="font-medium">
                      {store.stats.productsCount.toLocaleString()}
                    </div>
                  </div>
                </div>
                {store.ratings.reviewCount >= 0 && (
                  <>
                    <Separator />
                    <div className="flex items-center gap-3">
                      <Star className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Rating
                        </div>
                        <div className="font-medium flex items-center gap-1">
                          {store.ratings.averageRating.toFixed(1)}
                          <span className="text-sm text-muted-foreground">
                            ({store.ratings.reviewCount} reviews)
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {/* <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleFollowStore}
                  variant={isFollowing ? "outline" : "default"}
                  className="w-full justify-start gap-2"
                >
                  <Heart
                    className={`w-4 h-4 ${isFollowing ? "fill-current" : ""}`}
                  />
                  {isFollowing ? "Following" : "Follow Store"}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleShareStore}
                  className="w-full justify-start gap-2 bg-transparent"
                >
                  <Share2 className="w-4 h-4" />
                  {isCopied ? "Copied!" : "Share Store"}
                </Button>
              </CardContent>
            </Card> */}
          </div>
        </div>
      </div>
    </div>
  );
}
