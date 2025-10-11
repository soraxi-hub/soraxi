"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Users,
  Package,
  // Share2,
  Edit3,
  Save,
  X,
  Calendar,
  Store,
  AlertCircle,
  CheckCircle2,
  Clock,
  // Eye,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";
import { ProductCard } from "@/modules/products/product-detail/product-card";
import { StoreProfileManager } from "@/domain/stores/store-profile-manager";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { truncateText } from "@/lib/utils";

// Form schemas
const StoreNameFormSchema = z.object({
  name: z
    .string()
    .min(2, "Store name must be at least 2 characters")
    .max(50, "Store name must not exceed 50 characters")
    .regex(/^[a-zA-Z0-9\s\-_&.]+$/, "Store name contains invalid characters"),
});

const StoreDescriptionFormSchema = z.object({
  description: z
    .string()
    .min(100, "Description must be at least 100 characters")
    .max(1500, "Description must not exceed 1500 characters"),
});

export default function EnhancedStoreProfile() {
  // const [isCopied, setIsCopied] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [storeManager] = useState(() => new StoreProfileManager());

  const trpc = useTRPC();
  const {
    data: store,
    isLoading,
    refetch: refetchData,
  } = useQuery(trpc.storeProfile.getStoreProfilePrivate.queryOptions());

  // Initialize store manager with data
  useEffect(() => {
    if (store) {
      storeManager.setStoreData(store);
    }
  }, [store, storeManager]);

  // Store name form
  const nameForm = useForm<z.infer<typeof StoreNameFormSchema>>({
    resolver: zodResolver(StoreNameFormSchema),
    defaultValues: {
      name: store?.name || "",
    },
  });

  // Store description form
  const descriptionForm = useForm<z.infer<typeof StoreDescriptionFormSchema>>({
    resolver: zodResolver(StoreDescriptionFormSchema),
    defaultValues: {
      description: store?.description || "",
    },
  });

  // Update store name mutation (you'll need to add this to your procedures)
  const updateStoreName = useMutation(
    trpc.storeProfile.handleStoreNameUpdate.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message || "Store name updated successfully");
        setIsEditingName(false);
        refetchData();
        storeManager.clearPendingChanges();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update store name");
      },
    })
  );

  // Update store description mutation
  const updateStoreDescription = useMutation(
    trpc.storeProfile.handleStoreDescriptionUpdate.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message || "Store description updated successfully");
        setIsEditingDescription(false);
        refetchData();
        storeManager.clearPendingChanges();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update store description");
      },
    })
  );

  // const handleShareStore = () => {
  //   if (!store?.uniqueId) return;

  //   const storeUrl = `${window.location.origin}/brand/${store._id}`;
  //   navigator.clipboard.writeText(storeUrl);
  //   setIsCopied(true);
  //   toast.success("Store link copied to clipboard!");

  //   setTimeout(() => setIsCopied(false), 2000);
  // };

  const onSubmitName = (data: z.infer<typeof StoreNameFormSchema>) => {
    updateStoreName.mutate(data);
  };

  const onSubmitDescription = (
    data: z.infer<typeof StoreDescriptionFormSchema>
  ) => {
    updateStoreDescription.mutate(data);
  };

  const storeStats = storeManager.getStoreStats();
  const StoreStatusEnum = storeManager.getStoreStatus();

  if (isLoading || !store) {
    return (
      <div className="container mx-auto px-4 md:px-8 py-6">
        <div className="space-y-6">
          <div className="h-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-32 bg-muted animate-pulse rounded-lg" />
          <div className="h-64 bg-muted animate-pulse rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* Enhanced Store Header */}
      <Card>
        <CardContent className="p-0">
          <div className="relative h-48 bg-gradient-to-r from-muted/50 to-muted/30 rounded-t-lg">
            <div className="absolute -bottom-14 lg:-bottom-8 left-0 right-0 sm:left-6 px-4">
              <div className="bg-card border border-border p-6 rounded-lg shadow-lg dark:bg-transparent">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  {/* Store Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 group">
                      {isEditingName ? (
                        <Form {...nameForm}>
                          <form
                            onSubmit={nameForm.handleSubmit(onSubmitName)}
                            className="flex items-center gap-2 flex-1"
                          >
                            <FormField
                              control={nameForm.control}
                              name="name"
                              render={({ field }) => (
                                <FormItem className="flex-1">
                                  <FormControl>
                                    <Input
                                      {...field}
                                      className="text-2xl font-bold bg-input border-border"
                                      placeholder="Enter store name"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <Button
                              type="submit"
                              size="sm"
                              disabled={updateStoreName.isPending}
                              className="text-white bg-soraxi-green hover:bg-soraxi-green-hover"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setIsEditingName(false);
                                nameForm.reset({ name: store.name });
                              }}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </form>
                        </Form>
                      ) : (
                        <>
                          <h1 className="text-2xl lg:text-3xl font-bold truncate">
                            {store.name}
                          </h1>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsEditingName(true)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
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
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground hidden sm:inline-flex" />
                        <span className="font-medium">
                          {storeStats.followersCount.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">Followers</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground hidden sm:inline-flex" />
                        <span className="font-medium">
                          {storeStats.productsCount.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground">Products</span>
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

                  {/* Actions */}
                  <div className="flex gap-2">
                    {/* Sharing coming Later */}
                    {/* <Button
                      variant="outline"
                      onClick={handleShareStore}
                      className="gap-2 bg-transparent"
                    >
                      <Share2 className="h-4 w-4" />
                      {isCopied ? "Copied!" : "Share"}
                    </Button> */}
                    {/* Preview Coming Later */}
                    {/* <Button asChild className="gap-2">
                      <Link href={`/brand/${store._id}`} target="_blank">
                        <Eye className="h-4 w-4" />
                        Preview
                      </Link>
                    </Button> */}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="pt-20" />
        </CardContent>
      </Card>

      {/* Enhanced Content Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex gap-2">
            <Store className="h-4 w-4" /> Overview
          </TabsTrigger>
          <TabsTrigger value="products" className="flex gap-2">
            <Package className="h-4 w-4" /> Products
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex gap-2">
            <Edit3 className="h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Store Description */}
            <div className="lg:col-span-2">
              <Card className="enhanced-card">
                <CardHeader className="form-header">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Store Description</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        Tell customers about your store and what makes it
                        special
                      </p>
                    </div>
                    {!isEditingDescription && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditingDescription(true)}
                        className="gap-2"
                      >
                        <Edit3 className="h-4 w-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditingDescription ? (
                    <Form {...descriptionForm}>
                      <form
                        onSubmit={descriptionForm.handleSubmit(
                          onSubmitDescription
                        )}
                        className="space-y-4"
                      >
                        <FormField
                          control={descriptionForm.control}
                          name="description"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex justify-between">
                                <FormLabel>Description</FormLabel>
                                <span className="text-sm text-muted-foreground">
                                  {field.value?.length || 0}/1500
                                </span>
                              </div>
                              <FormControl>
                                <Textarea
                                  {...field}
                                  placeholder="Describe your store, products, and what makes you unique..."
                                  className="min-h-[120px] resize-none bg-input border-border"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="form-actions">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setIsEditingDescription(false);
                              descriptionForm.reset({
                                description: store.description,
                              });
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="submit"
                            disabled={updateStoreDescription.isPending}
                          >
                            {updateStoreDescription.isPending
                              ? "Saving..."
                              : "Save Changes"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  ) : (
                    <div className="space-y-4">
                      {store.description ? (
                        <>
                          {store.description.length < 100 && (
                            <Alert>
                              <AlertCircle className="h-4 w-4" />
                              <AlertDescription>
                                Your store description is quite short. Consider
                                adding more details to help customers understand
                                your store better.
                              </AlertDescription>
                            </Alert>
                          )}
                          <div className="prose dark:prose-invert max-w-none">
                            <p className="text-foreground leading-relaxed">
                              {store.description}
                            </p>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-8">
                          <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <h3 className="text-lg font-semibold mb-2">
                            No description yet
                          </h3>
                          <p className="text-muted-foreground mb-4">
                            Add a description to help customers learn about your
                            store
                          </p>
                          <Button
                            onClick={() => setIsEditingDescription(true)}
                            className="gap-2"
                          >
                            <Edit3 className="h-4 w-4" />
                            Add Description
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Store Stats Sidebar */}
            <div className="space-y-6">
              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle className="text-lg">Store Statistics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      Total Followers
                    </span>
                    <span className="font-semibold">
                      {storeStats.followersCount.toLocaleString()}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">
                      Active Products
                    </span>
                    <span className="font-semibold">
                      {storeStats.productsCount.toLocaleString()}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Store Age</span>
                    <span className="font-semibold">{storeStats.storeAge}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    <Badge
                      className={`status-badge ${StoreStatusEnum.statusColor} text-white`}
                    >
                      {StoreStatusEnum.statusText}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card className="enhanced-card">
                <CardHeader>
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start gap-2 bg-transparent"
                  >
                    <Link href={`/store/${store._id}/products/upload`}>
                      <Package className="h-4 w-4" />
                      Add Product
                    </Link>
                  </Button>
                  {/* This Feature is disabled for now */}
                  {/* <Button
                    asChild
                    variant="outline"
                    className="w-full justify-start gap-2 bg-transparent"
                  >
                    <Link href={`/brand/${store._id}`} target="_blank">
                      <Eye className="h-4 w-4" />
                      View Store
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleShareStore}
                    className="w-full justify-start gap-2 bg-transparent"
                  >
                    <Share2 className="h-4 w-4" />
                    Share Store
                  </Button> */}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="products" className="mt-6">
          <Card className="enhanced-card">
            <CardHeader>
              <CardTitle className="text-2xl">Product Inventory</CardTitle>
              <p className="text-muted-foreground">
                Manage your products and track their performance
              </p>
            </CardHeader>
            <CardContent>
              {store.products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-24 h-24 rounded-full flex justify-center items-center bg-primary/10 mb-6">
                    <Package className="h-12 w-12 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    No products yet
                  </h3>
                  <p className="text-muted-foreground mb-6 max-w-md">
                    Start building your store by uploading your first product.
                    Products you add will appear here and be visible to your
                    customers.
                  </p>
                  <Button asChild className="gap-2">
                    <Link href={`/store/${store._id}/products/upload`}>
                      <Package className="h-4 w-4" />
                      Add Your First Product
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {store.products.map((product) => (
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

        <TabsContent value="settings" className="mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="enhanced-card">
              <CardHeader className="form-header">
                <CardTitle>Store Information</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Update your store&#39;s basic information
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="store-name">Store Name</Label>
                  <div className="flex gap-2">
                    <Input
                      id="store-name"
                      value={store.name}
                      disabled
                      className="bg-muted"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditingName(true)}
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-email">Store Email</Label>
                  <Input
                    id="store-email"
                    value={store.storeEmail}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="store-id">Store ID</Label>
                  <Input
                    id="store-id"
                    value={store.uniqueId}
                    disabled
                    className="bg-muted font-mono"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="enhanced-card">
              <CardHeader className="form-header">
                <CardTitle>Store Status</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Current status and verification information
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Current Status</span>
                  <Badge
                    className={`status-badge ${StoreStatusEnum.statusColor} text-white`}
                  >
                    {StoreStatusEnum.statusText}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span>Verification Status</span>
                  <Badge
                    variant={
                      store.verification?.isVerified ? "outline" : "secondary"
                    }
                  >
                    {store.verification?.isVerified ? "Verified" : "Pending"}
                  </Badge>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span>Member Since</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(store.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}
