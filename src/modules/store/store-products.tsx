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
  Trash2,
  Plus,
  MoreHorizontal,
  Calendar,
  DollarSign,
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
import type { StoreProduct } from "@/types/onboarding";
import { formatNaira } from "@/lib/utils/naira";

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
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");

  useEffect(() => {
    loadProducts();
  }, [statusFilter, visibilityFilter]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") {
        params.append(
          "status",
          statusFilter === "approved" ? "approved" : "pending"
        );
      }
      if (visibilityFilter !== "all") {
        params.append("visible", visibilityFilter);
      }

      const response = await fetch(`/api/store/products?${params}`);
      const data = await response.json();

      if (response.ok) {
        setProducts(data.products);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      // toast({
      //   title: "Error",
      //   description: "Failed to load products",
      //   variant: "destructive",
      // })
    } finally {
      setLoading(false);
    }
  };

  const handleVisibilityToggle = async (
    productId: string,
    currentVisibility: boolean
  ) => {
    try {
      const response = await fetch(
        `/api/store/products/${productId}/visibility`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isVisible: !currentVisibility }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        toast.success(
          `Product ${!currentVisibility ? "shown" : "hidden"} successfully`
        );
        loadProducts();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update visibility"
      );
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this product? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/store/products/${productId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        // toast({
        //   title: "Success",
        //   description: "Product deleted successfully",
        // })
        loadProducts();
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      // toast({
      //   title: "Error",
      //   description: error instanceof Error ? error.message : "Failed to delete product",
      //   variant: "destructive",
      // })
    }
  };

  const getStatusBadge = (isVerified: boolean) => {
    if (isVerified) {
      return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
    } else {
      return (
        <Badge className="bg-yellow-100 text-yellow-800">Pending Review</Badge>
      );
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

  // const formatPrice = (price?: number, sizes?: any[]) => {
  //   if (sizes && sizes.length > 0) {
  //     const minPrice = Math.min(...sizes.map((s) => s.price));
  //     const maxPrice = Math.max(...sizes.map((s) => s.price));
  //     if (minPrice === maxPrice) {
  //       return `₦${(minPrice / 100).toFixed(2)}`;
  //     }
  //     return `₦${(minPrice / 100).toFixed(2)} - ₦${(maxPrice / 100).toFixed(
  //       2
  //     )}`;
  //   }
  //   return price ? `₦${(price / 100).toFixed(2)}` : "N/A";
  // };

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
            Manage your store's product catalog
          </p>
        </div>
        <Link href={`/store/${store_id}/products/upload`}>
          <Button className="bg-soraxi-green hover:bg-soraxi-green/90">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Visibility</Label>
              <Select
                value={visibilityFilter}
                onValueChange={setVisibilityFilter}
              >
                <SelectTrigger>
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
              <Button onClick={loadProducts} className="w-full">
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
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
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
                          {product.images.length > 0 ? (
                            <img
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
                          <p className="text-sm text-muted-foreground">
                            ID: {product.id.slice(-8)}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {product.category.map((cat, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {cat}
                          </Badge>
                        ))}
                      </div>
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
                      {getStatusBadge(product.isVerifiedProduct)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getVisibilityBadge(product.isVisible)}
                        <Switch
                          checked={product.isVisible}
                          onCheckedChange={() =>
                            handleVisibilityToggle(
                              product.id,
                              product.isVisible
                            )
                          }
                        />
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
                          <DropdownMenuItem asChild>
                            <Link href={`/products/${product.slug}`}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Product
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/store/products/${product.id}/edit`}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Product
                            </Link>
                          </DropdownMenuItem>
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
                          <DropdownMenuItem
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Product
                          </DropdownMenuItem>
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

// "use client";

// // Core Imports
// import { useEffect, useState } from "react";
// import axios from "axios";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import Image from "next/image";

// // Custom Hooks and Utilities
// import { toast } from "sonner";
// // import { formatNaira, formatDate } from "@/lib/utils";
// // import { Skeleton } from "@/components/ui/skeleton";

// // UI Components
// import { Button } from "@/components/ui/button";
// // import { Badge } from "@/components/ui/badge";
// import {
//   //   Loader2,
//   MoreHorizontal,
//   PlusCircle,
//   Eye,
//   EyeOff,
//   CheckCircle2,
//   XCircle,
// } from "lucide-react";
// import {
//   Card,
//   CardContent,
//   CardFooter,
//   //   CardDescription,
//   //   CardHeader,
//   //   CardTitle,
// } from "@/components/ui/card";
// import {
//   Table,
//   TableBody,
//   TableCell,
//   TableHead,
//   TableHeader,
//   TableRow,
// } from "@/components/ui/table";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuLabel,
//   DropdownMenuTrigger,
// } from "@/components/ui/dropdown-menu";

// // Types
// // import { Product } from "@/types";

// /**
//  * StoreInventory component manages and displays product inventory for a store
//  * @component
//  * @param {Object} props - Component props
//  * @param {Object} props.params - Route parameters
//  * @param {string} props.params.slug - Store identifier
//  */
// export default function StoreProducts({
//   store_id,
//   error,
// }: {
//   store_id: string;
//   error?: string;
// }) {
//   const router = useRouter();
//   const [isLoading, setIsLoading] = useState(false);
//   const [storeProducts, setStoreProducts] = useState([]);
//   const [currentPage, setCurrentPage] = useState(1);
//   const pageSize = 10;

//   /**
//    * Fetches store products from API with error handling
//    * @async
//    */
//   //   useEffect(() => {
//   //     const controller = new AbortController();

//   //     const fetchProducts = async () => {
//   //       try {
//   //         const { data } = await axios.post<{ products: Product[] }>(
//   //           "/api/store/products",
//   //           { signal: controller.signal }
//   //         );
//   //         setStoreProducts(data.products);
//   //       } catch (error: any) {
//   //         if (!axios.isCancel(error)) {
//   //           console.error("Product fetch error:", error.message);
//   //           toast({
//   //             title: "Error",
//   //             variant: "destructive",
//   //             description: "Failed to load products. Please try again later.",
//   //           });
//   //         }
//   //       }
//   //     };

//   //     fetchProducts();
//   //     return () => controller.abort();
//   //   }, []);

//   /**
//    * Handles product deletion with confirmation
//    * @async
//    * @param {string} productId - ID of the product to delete
//    */
//   const handleDelete = async (productId: string) => {
//     if (!confirm("Permanently delete this product?")) return;

//     setIsLoading(true);
//     try {
//       await axios.delete("/api/store/delete-product", { data: { productId } });
//       setStoreProducts((prev) =>
//         prev.filter((product) => product._id !== productId)
//       );
//       //   toast({ title: "Success", description: "Product deleted successfully" });
//     } catch (error: any) {
//       console.error("Deletion error:", error.message);
//       //   toast({
//       //     title: "Error",
//       //     variant: "destructive",
//       //     description: error.response?.data?.message || "Deletion failed",
//       //   });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   /**
//    * Toggles product visibility state
//    * @async
//    * @param {string} productId - ID of the product to toggle
//    */
//   const toggleProductVisibility = async (productId: string) => {
//     setIsLoading(true);
//     try {
//       await axios.post("/api/store/toggle-product-visibility", { productId });
//       setStoreProducts((prev) =>
//         prev.map((product) =>
//           product._id === productId
//             ? { ...product, isVisible: !product.isVisible }
//             : product
//         )
//       );
//       //   toast({ title: "Success", description: "Visibility updated" });
//     } catch (error: any) {
//       console.error("Visibility toggle error:", error.message);
//       //   toast({
//       //     title: "Error",
//       //     variant: "destructive",
//       //     description: error.response?.data?.message || "Update failed",
//       //   });
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // Pagination calculations
//   const totalProducts = storeProducts.length;
//   const totalPages = Math.ceil(totalProducts / pageSize);
//   const currentProducts = storeProducts.slice(
//     (currentPage - 1) * pageSize,
//     currentPage * pageSize
//   );

//   return (
//     <main className="flex flex-col gap-4 p-4 md:p-6">
//       {/* Header Section */}
//       <div className="flex items-center justify-between gap-4">
//         <div className="space-y-1">
//           <h1 className="text-2xl font-bold">Inventory Management</h1>
//           <p className="text-muted-foreground">
//             Manage {storeProducts.length} products in your store
//           </p>
//         </div>
//         <Button
//           asChild
//           className="bg-soraxi-green hover:bg-soraxi-green/85 text-white"
//         >
//           <Link href={`/store/${store_id}/products/upload`}>
//             <PlusCircle className="mr-2 h-4 w-4" />
//             Add Product
//           </Link>
//         </Button>
//       </div>

//       {/* Inventory Table Card */}
//       <Card>
//         <CardContent>
//           <Table>
//             <TableHeader>
//               <TableRow>
//                 <TableHead className="w-[100px]">Preview</TableHead>
//                 <TableHead>Product</TableHead>
//                 <TableHead>Status</TableHead>
//                 <TableHead className="text-right">Stock</TableHead>
//                 <TableHead className="text-right">Price</TableHead>
//                 <TableHead className="text-right">Actions</TableHead>
//               </TableRow>
//             </TableHeader>

//             <TableBody>
//               {currentProducts.map((product) => (
//                 <TableRow key={product._id} className="hover:bg-muted/50">
//                   {/* Product Image */}
//                   <TableCell>
//                     <div className="relative aspect-square w-16 overflow-hidden rounded-md">
//                       <Image
//                         fill
//                         alt={product.name}
//                         src={product.images[0] || "/placeholder-product.jpg"}
//                         className="object-cover"
//                         loading="lazy"
//                         placeholder="blur"
//                         blurDataURL="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkqAcAAIUAgUW0RjgAAAAASUVORK5CYII="
//                       />
//                     </div>
//                   </TableCell>

//                   {/* Product Details */}
//                   <TableCell className="font-medium max-w-[300px] line-clamp-2">
//                     {product.name}
//                   </TableCell>

//                   {/* Verification Status */}
//                   <TableCell>
//                     <div className="flex items-center gap-2">
//                       {product.isVerifiedProduct ? (
//                         <CheckCircle2 className="h-4 w-4 text-green-600" />
//                       ) : (
//                         <XCircle className="h-4 w-4 text-yellow-600" />
//                       )}
//                       <span>
//                         {product.isVerifiedProduct ? "Verified" : "Pending"}
//                       </span>
//                     </div>
//                   </TableCell>

//                   {/* Stock Quantity */}
//                   <TableCell className="text-right">
//                     {product.productQuantity ??
//                       product.sizes?.[0]?.quantity ??
//                       0}
//                   </TableCell>

//                   {/* Product Price */}
//                   <TableCell className="text-right">
//                     {formatNaira(
//                       product.price ?? product.sizes?.[0]?.price ?? 0
//                     )}
//                   </TableCell>

//                   {/* Action Menu */}
//                   <TableCell className="text-right">
//                     <DropdownMenu>
//                       <DropdownMenuTrigger asChild>
//                         <Button variant="ghost" size="icon">
//                           <MoreHorizontal className="h-4 w-4" />
//                         </Button>
//                       </DropdownMenuTrigger>
//                       <DropdownMenuContent align="end">
//                         <DropdownMenuLabel>Product Actions</DropdownMenuLabel>

//                         <Link
//                           href={`/store/${params.slug}/edit-product/${product._id}`}
//                         >
//                           <DropdownMenuItem className="cursor-pointer">
//                             Edit Details
//                           </DropdownMenuItem>
//                         </Link>

//                         <DropdownMenuItem
//                           onSelect={() => toggleProductVisibility(product._id!)}
//                           disabled={isLoading}
//                         >
//                           {product.isVisible ? (
//                             <EyeOff className="mr-2 h-4 w-4" />
//                           ) : (
//                             <Eye className="mr-2 h-4 w-4" />
//                           )}
//                           Mark {product.isVisible ? "Hidden" : "Visible"}
//                         </DropdownMenuItem>

//                         {/* <DropdownMenuItem
//                           className="text-destructive"
//                           onSelect={() => handleDelete(product._id!)}
//                           disabled={isLoading}
//                         >
//                           Delete Product
//                         </DropdownMenuItem> */}
//                       </DropdownMenuContent>
//                     </DropdownMenu>
//                   </TableCell>
//                 </TableRow>
//               ))}
//             </TableBody>
//           </Table>
//         </CardContent>

//         {/* Pagination Footer */}
//         <CardFooter className="flex flex-col sm:flex-row justify-between items-center gap-4">
//           <div className="text-sm text-muted-foreground">
//             Page {currentPage} of {totalPages}
//           </div>

//           <div className="flex gap-2">
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
//               disabled={currentPage === 1}
//             >
//               Previous
//             </Button>
//             <Button
//               variant="outline"
//               size="sm"
//               onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
//               disabled={currentPage === totalPages}
//             >
//               Next
//             </Button>
//           </div>
//         </CardFooter>
//       </Card>
//     </main>
//   );
// }
