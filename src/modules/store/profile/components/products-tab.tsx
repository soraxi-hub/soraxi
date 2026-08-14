"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Pencil, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  SoraxiCard,
  SoraxiCardContent,
  SoraxiCardDescription,
  SoraxiCardHeader,
  SoraxiCardTitle,
} from "@/components/ui/soraxi-card";
import { ProductStatusEnum } from "@/enums";
import { cn } from "@/lib/utils";
import type { PublicToJSON } from "@/domain/products/product-interface";
import { useTRPC } from "@/trpc/client";

import { pageCardLg } from "../../components/page-card.styles";

interface ProductsTabProps {
  storeId: string;
  products: PublicToJSON[];
}

export function ProductsTab({ storeId, products }: ProductsTabProps) {
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return products;
    return products.filter((p) => p.name.toLowerCase().includes(query));
  }, [products, search]);

  return (
    <SoraxiCard className={pageCardLg}>
      <SoraxiCardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <SoraxiCardTitle>Your products</SoraxiCardTitle>
            <SoraxiCardDescription className="mt-1 text-muted-foreground">
              {products.length} uploaded · toggle to show or hide on your store.
            </SoraxiCardDescription>
          </div>

          <Button
            asChild
            size="sm"
            className="shrink-0 gap-1.5 bg-soraxi-green text-white hover:bg-soraxi-green-hover"
          >
            <Link href={`/store/${storeId}/products/upload`}>
              <Plus className="size-3.5" />
              Add
            </Link>
          </Button>
        </div>
      </SoraxiCardHeader>

      <SoraxiCardContent className="space-y-3">
        {products.length > 0 && (
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search your products..."
              aria-label="Search your products"
              className="pl-9"
            />
          </div>
        )}

        {products.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No products yet. Add your first one to start selling.
          </p>
        ) : visible.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing matches &ldquo;{search.trim()}&rdquo;.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((product) => (
              <ProductRow
                key={product.productId}
                product={product}
                storeId={storeId}
              />
            ))}
          </ul>
        )}
      </SoraxiCardContent>
    </SoraxiCard>
  );
}

/**
 * One product, with the two things an owner does from a list: hide it, or edit
 * it.
 *
 * Hiding is optimistic — the switch moves immediately and reverts if the server
 * refuses. A toggle that waits on a round trip before moving feels broken, and
 * this one gets used in bursts when stock runs out.
 */
function ProductRow({
  product,
  storeId,
}: {
  product: PublicToJSON;
  storeId: string;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [isVisible, setIsVisible] = useState(product.isVisible);

  /**
   * Uses the existing `handleVisibilityToggle`, which also enforces the store
   * status rules — a pending, rejected or suspended store cannot publish
   * products. Those checks are the reason this lives on the server and not in
   * a one-line `updateOne`.
   */
  const setVisibility = useMutation({
    ...trpc.storeProducts.handleVisibilityToggle.mutationOptions(),
    onError: (error) => {
      // Revert the optimistic flip. The server refuses for real reasons
      // (suspended store, unverified product), so the switch must not lie.
      setIsVisible((current) => !current);
      toast.error(error.message || "Could not update that product");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: trpc.storeProfile.getStoreProfilePrivate.queryKey(),
      });
    },
  });

  const stock = product.productQuantity ?? 0;
  const isDraft = product.status === ProductStatusEnum.Draft;

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
        {product.images?.[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <ImageIcon className="size-4 text-muted-foreground/60" aria-hidden />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{product.name}</p>
        <p className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-soraxi-green">{product.formattedPrice}</span>
          <span className="text-muted-foreground">·</span>
          <span
            className={cn(
              stock === 0 ? "text-soraxi-error" : "text-muted-foreground",
            )}
          >
            {stock === 0 ? "Out of stock" : `${stock} in stock`}
          </span>
          {isDraft && (
            <Badge variant="outline" className="text-[10px]">
              Draft
            </Badge>
          )}
        </p>
      </div>

      <Switch
        checked={isVisible}
        disabled={setVisibility.isPending}
        aria-label={`${isVisible ? "Hide" : "Show"} ${product.name}`}
        onCheckedChange={(next) => {
          setIsVisible(next);
          setVisibility.mutate({
            productId: product.productId,
            isVisible: next,
          });
        }}
      />

      <Link
        href={`/store/${storeId}/products/${product.productId}/edit`}
        aria-label={`Edit ${product.name}`}
        className="shrink-0 text-muted-foreground transition-colors hover:text-soraxi-green"
      >
        <Pencil className="size-4" />
      </Link>
    </li>
  );
}
