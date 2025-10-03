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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Package,
  Search,
  Filter,
  Eye,
  EyeOff,
  Edit,
  // Trash2,
  Plus,
  MoreHorizontal,
  Calendar,
  // DollarSign,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";
import { formatNaira } from "@/lib/utils/naira";
import Image from "next/image";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { inferProcedureOutput } from "@trpc/server";
import { AppRouter } from "@/trpc/routers/_app";
import { ProductStatusEnum } from "@/validators/product-validators";

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
  const loadProductsMutation = useMutation(
    trpc.store.getStoreProducts.mutationOptions({
      onSuccess: (data) => {
        setProducts(data.products);
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
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
        error instanceof Error ? error.message : "Failed to load products"
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
    })
  );

  const handleVisibilityToggle = async (
    productId: string,
    currentVisibility: boolean
  ) => {
    visibilityToggle.mutate({ productId, isVisible: !currentVisibility });
  };

  // const handleDeleteProduct = async (productId: string) => {
  //   if (
  //     !confirm(
  //       "Are you sure you want to delete this product? This action cannot be undone."
  //     )
  //   ) {
  //     return;
  //   }

  //   try {
  //     const response = await fetch(`/api/store/products/${productId}`, {
  //       method: "DELETE",
  //     });

  //     const data = await response.json();

  //     if (response.ok) {
  //       // toast({
  //       //   title: "Success",
  //       //   description: "Product deleted successfully",
  //       // })
  //       loadProducts();
  //     } else {
  //       throw new Error(data.error);
  //     }
  //   } catch (error) {
  //     // toast({
  //     //   title: "Error",
  //     //   description: error instanceof Error ? error.message : "Failed to delete product",
  //     //   variant: "destructive",
  //     // })
  //   }
  // };

  // const getStatusBadge = (isVerified: boolean) => {
  //   if (isVerified) {
  //     return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
  //   } else {
  //     return (
  //       <Badge className="bg-yellow-100 text-yellow-800">Pending Review</Badge>
  //     );
  //   }
  // };

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
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
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
                    value as "pending" | "approved" | "rejected" | "all"
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Product Status</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Visibility</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Loading products...
                  </TableCell>
                </TableRow>
              ) : filteredProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    <div className="space-y-2">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto" />
                      <p className="text-muted-foreground">No products found</p>
                      <Link href={`/store/${store_id}/products/upload`}>
                        <Button variant="outline" size="sm">
                          <Plus className="w-4 h-4 mr-2" />
                          Add Your First Product
                        </Button>
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                          {product.images && product.images.length > 0 ? (
                            <Image
                              width={100}
                              height={100}
                              src={product.images[0] || "/placeholder.svg"}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <Package className="w-6 h-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium line-clamp-1">
                            {product.name}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getProductStatusBadge(product.status)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-1">
                        <span className="font-medium">
                          {formatNaira(product.price!)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">
                        {product.sizes && product.sizes.length > 0
                          ? product.sizes.reduce(
                              (total, size) => total + size.quantity,
                              0
                            )
                          : product.productQuantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getVisibilityBadge(product.isVisible)}
                        {product.status !== ProductStatusEnum.Draft && (
                          <Switch
                            checked={product.isVisible}
                            onCheckedChange={() =>
                              handleVisibilityToggle(
                                product.id,
                                product.isVisible
                              )
                            }
                            className="hidden lg:inline-block"
                          />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>
                          {new Date(product.createdAt).toLocaleDateString()}
                        </p>
                        <p className="text-muted-foreground">
                          {new Date(product.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {product.status !== ProductStatusEnum.Draft && (
                            <DropdownMenuItem asChild>
                              <Link href={`/products/${product.slug}`}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Product
                              </Link>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/store/${store_id}/products/${product.id}/edit`}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Product
                            </Link>
                          </DropdownMenuItem>
                          {product.status !== ProductStatusEnum.Draft && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  handleVisibilityToggle(
                                    product.id,
                                    product.isVisible
                                  )
                                }
                                className="text-blue-600"
                              >
                                {product.isVisible ? (
                                  <>
                                    <EyeOff className="w-4 h-4 mr-2" />
                                    Hide Product
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4 mr-2" />
                                    Show Product
                                  </>
                                )}
                              </DropdownMenuItem>
                            </>
                          )}
                          {/* <DropdownMenuItem
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Product
                          </DropdownMenuItem> */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
