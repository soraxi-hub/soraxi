"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Package,
  Search,
  Filter,
  Eye,
  EyeOff,
  Plus,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/trpc/routers/_app";
import { ProductStatusEnum } from "@/validators/product-validators";
import { ReOrderDialog } from "./components/drag-n-drop/dialog-container";
import { ProductsTable } from "./components/products-table";

type Output = inferProcedureOutput<AppRouter["store"]["getStoreProducts"]>;
type StoreProduct = Output["products"][number];

/**
 * Store Products Management Component
 * Allows stores to view and manage their products
 */

interface StoreProductsManagementProps {
  store_id: string;
}

export function StoreProductsManagement({
  store_id,
}: StoreProductsManagementProps) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "pending" | "approved" | "rejected" | "all"
  >("all");
  const [visibilityFilter, setVisibilityFilter] = useState<
    "true" | "false" | "all"
  >("all");

  const trpc = useTRPC();
  const [showReOrderDialog, setShowReOrderDialog] = useState(false);
  const [reOrderedimages, setReOrderedImages] = useState<string[]>([]);
  const [currentProductId, setCurrentProductId] = useState<string | null>(null);
  const loadProductsMutation = useMutation(
    trpc.store.getStoreProducts.mutationOptions({
      onSuccess: (data) => {
        setProducts(data.products);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  useEffect(() => {
    loadProducts();
  }, [statusFilter, visibilityFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);

      const result = await loadProductsMutation.mutateAsync({
        page: 1,
        limit: 20,
        status: statusFilter === "all" ? undefined : statusFilter,
        visible: visibilityFilter === "all" ? undefined : visibilityFilter,
      });

      setProducts(result.products);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to load products",
      );
    } finally {
      setLoading(false);
    }
  };

  const visibilityToggle = useMutation(
    trpc.store.handleVisibilityToggle.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message);
        loadProducts();
      },
      onError: (error) => {
        toast.error(error.message);
      },
    }),
  );

  const handleVisibilityToggle = async (
    productId: string,
    currentVisibility: boolean,
  ) => {
    visibilityToggle.mutate({ productId, isVisible: !currentVisibility });
  };

  const updateImagesOrder = useMutation(
    trpc.store.updateProductImagesOrder.mutationOptions({
      onSuccess: (data) => {
        toast.success(data.message || "Images updated");
        setShowReOrderDialog(false);
        loadProducts(); // refresh list
      },
      onError: (err) => {
        toast.error(err.message);
      },
    }),
  );

  const handleSave = async () => {
    if (!currentProductId) {
      toast.error("Please, make sure to update product images");
      return;
    }

    await updateImagesOrder.mutateAsync({
      productId: currentProductId,
      images: reOrderedimages,
    });
  };

  /**
   * Returns a styled Badge component based on product status
   */
  const getProductStatusBadge = (status: ProductStatusEnum) => {
    switch (status) {
      case ProductStatusEnum.Draft:
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;

      case ProductStatusEnum.Pending:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;

      case ProductStatusEnum.Approved:
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;

      case ProductStatusEnum.Rejected:
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;

      case ProductStatusEnum.Archived:
        return (
          <Badge className="bg-purple-100 text-purple-800">Archived</Badge>
        );

      default:
        return <Badge className="bg-gray-200 text-gray-600">Unknown</Badge>;
    }
  };

  const getVisibilityBadge = (isVisible: boolean) => {
    return isVisible ? (
      <Badge variant="outline" className="text-green-600 border-green-600">
        <Eye className="w-3 h-3 mr-1" />
        Visible
      </Badge>
    ) : (
      <Badge variant="outline" className="text-gray-600 border-gray-600">
        <EyeOff className="w-3 h-3 mr-1" />
        Hidden
      </Badge>
    );
  };

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Products</h1>
          <p className="text-muted-foreground">
            Manage your store&#39;s product catalog
          </p>
        </div>
        <Link href={`/store/${store_id}/products/upload`}>
          <Button className="bg-soraxi-green hover:bg-soraxi-green-hover text-white">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="w-8 h-8 text-soraxi-green" />
              <div>
                <p className="text-2xl font-bold">{products.length}</p>
                <p className="text-sm text-muted-foreground">Total Products</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Eye className="w-8 h-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {products.filter((p) => p.isVerifiedProduct).length}
                </p>
                <p className="text-sm text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="w-8 h-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">
                  {products.filter((p) => !p.isVerifiedProduct).length}
                </p>
                <p className="text-sm text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <EyeOff className="w-8 h-8 text-gray-600" />
              <div>
                <p className="text-2xl font-bold">
                  {products.filter((p) => !p.isVisible).length}
                </p>
                <p className="text-sm text-muted-foreground">Hidden</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search Products</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value) =>
                  setStatusFilter(
                    value as "pending" | "approved" | "rejected" | "all",
                  )
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={visibilityFilter}
                onValueChange={(value) => {
                  setVisibilityFilter(value as "true" | "false" | "all");
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="true">Visible Only</SelectItem>
                  <SelectItem value="false">Hidden Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={loadProducts}
                className="w-full bg-soraxi-green hover:bg-soraxi-green-hover text-white"
              >
                <Filter className="w-4 h-4 mr-2" />
                Apply Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Table */}
      <Card>
        <CardHeader>
          <CardTitle>Products ({filteredProducts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductsTable
            products={filteredProducts}
            loading={loading}
            storeId={store_id}
            onToggleVisibility={handleVisibilityToggle}
            onReorderImages={(product) => {
              setCurrentProductId(product.id);
              setReOrderedImages(product.images ?? []);
              setShowReOrderDialog(true);
            }}
            getStatusBadge={getProductStatusBadge}
            getVisibilityBadge={getVisibilityBadge}
          />
        </CardContent>
      </Card>

      {showReOrderDialog && (
        <ReOrderDialog
          isDialogOpen={showReOrderDialog}
          onClose={() => setShowReOrderDialog(false)}
          setReOrderedImages={setReOrderedImages}
          reOrderedimages={reOrderedimages}
          onHandleSave={handleSave}
        />
      )}
    </div>
  );
}
