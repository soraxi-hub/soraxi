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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Package, Eye, Edit, MoreHorizontal, Share2, Copy } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { formatNaira } from "@/lib/utils/naira";
import { siteConfig } from "@/config/site";
import { truncateText } from "@/lib/utils";
import { ProductStatusEnum } from "@/enums";
import { buildShareLinks } from "@/lib/utils/share-links";
import { FacebookIcon, WhatsappIcon, XIcon } from "@/components/icons";

import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";

type Output = inferProcedureOutput<AppRouter["storeProducts"]["getStoreProducts"]>;
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
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Open actions menu"
                    >
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

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="hover:cursor-pointer">
                        <Share2 className="mr-2 w-4 h-4" />
                        Share
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent>
                        <ShareProductMenuItems
                          slug={product.slug}
                          name={product.name}
                        />
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

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

/**
 * The share channels for a single product, as dropdown items rather than the
 * icon-button row used elsewhere — this is one entry in an existing "Actions"
 * menu, not a standalone widget.
 */
function ShareProductMenuItems({ slug, name }: { slug: string; name: string }) {
  const url = `${siteConfig.url}/products/${slug}`;
  const text = `Check out ${name} on my ${siteConfig.name} store!`;
  const links = buildShareLinks({ url, text });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Product link copied to clipboard!");
    } catch {
      toast.error("Couldn't copy the link. Copy it from the address bar.");
    }
  };

  return (
    <>
      <DropdownMenuItem asChild className="hover:cursor-pointer">
        <a href={links.whatsapp} target="_blank" rel="noopener noreferrer">
          <WhatsappIcon className="mr-2 w-4 h-4" />
          WhatsApp
        </a>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className="hover:cursor-pointer">
        <a href={links.x} target="_blank" rel="noopener noreferrer">
          <XIcon className="mr-2 w-4 h-4" />
          X
        </a>
      </DropdownMenuItem>

      <DropdownMenuItem asChild className="hover:cursor-pointer">
        <a href={links.facebook} target="_blank" rel="noopener noreferrer">
          <FacebookIcon className="mr-2 w-4 h-4" />
          Facebook
        </a>
      </DropdownMenuItem>

      <DropdownMenuItem
        onClick={handleCopyLink}
        className="hover:cursor-pointer"
      >
        <Copy className="mr-2 w-4 h-4" />
        Copy link
      </DropdownMenuItem>
    </>
  );
}
