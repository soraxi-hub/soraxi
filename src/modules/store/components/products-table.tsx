import { ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Package, Eye, Edit, MoreHorizontal } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { formatNaira } from "@/lib/utils/naira";
import { siteConfig } from "@/config/site";
import { truncateText } from "@/lib/utils";
import { ProductStatusEnum } from "@/validators/product-validators";

import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type Output = inferProcedureOutput<AppRouter["store"]["getStoreProducts"]>;
type Product = Output["products"];

interface ProductsTableProps {
  products: Product;
  loading: boolean;
  storeId: string;

  onToggleVisibility: (id: string, current: boolean) => void;
  onReorderImages: (product: Product[number]) => void;

  getStatusBadge: (status: ProductStatusEnum) => ReactNode;
  getVisibilityBadge: (visible: boolean) => ReactNode;
}

export function ProductsTable({
  products,
  loading,
  storeId,
  onToggleVisibility,
  onReorderImages,
  getStatusBadge,
  getVisibilityBadge,
}: ProductsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Status</TableHead>
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
            <TableCell colSpan={7} className="text-center py-8">
              Loading products...
            </TableCell>
          </TableRow>
        ) : products.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8">
              <Package className="w-12 h-12 mx-auto text-muted-foreground" />
              <p>No products found</p>
            </TableCell>
          </TableRow>
        ) : (
          products.map((product) => (
            <TableRow key={product.id}>
              {/* Product */}
              <TableCell>
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                    {product.images?.length ? (
                      <Image
                        width={100}
                        height={100}
                        src={product.images[0] || siteConfig.placeHolderImg}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <p className="font-medium">{truncateText(product.name)}</p>
                </div>
              </TableCell>

              {/* Status */}
              <TableCell>{getStatusBadge(product.status)}</TableCell>

              {/* Price */}
              <TableCell>{formatNaira(product.price!)}</TableCell>

              {/* Stock */}
              <TableCell>
                {product.sizes?.length
                  ? product.sizes.reduce((t, s) => t + s.quantity, 0)
                  : product.productQuantity}
              </TableCell>

              {/* Visibility */}
              <TableCell>
                <div className="flex items-center space-x-2">
                  {getVisibilityBadge(product.isVisible)}
                  <Switch
                    checked={product.isVisible}
                    onCheckedChange={() =>
                      onToggleVisibility(product.id, product.isVisible)
                    }
                  />
                </div>
              </TableCell>

              {/* Created */}
              <TableCell>
                {new Date(product.createdAt).toLocaleDateString()}
              </TableCell>

              {/* Actions */}
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem asChild className="hover:cursor-pointer">
                      <Link href={`/products/${product.slug}`} target="_blank">
                        <Eye className="mr-2 w-4 h-4" />
                        View
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild className="hover:cursor-pointer">
                      <Link
                        href={`/store/${storeId}/products/${product.id}/edit`}
                      >
                        <Edit className="mr-2 w-4 h-4" />
                        Edit
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={() =>
                        onToggleVisibility(product.id, product.isVisible)
                      }
                      className="hover:cursor-pointer text-blue-600"
                    >
                      {product.isVisible ? "Unpublish" : "Publish"}
                    </DropdownMenuItem>

                    <DropdownMenuItem
                      onClick={() => onReorderImages(product)}
                      className="hover:cursor-pointer"
                    >
                      Reorder Images
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}
