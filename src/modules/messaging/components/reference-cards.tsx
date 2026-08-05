"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type {
  OrderRefView,
  ProductRefView,
} from "@/domain/messaging/messaging-types";

/**
 * A square thumbnail that degrades to a placeholder.
 *
 * Products without images are common enough in this catalogue that the
 * empty state has to look deliberate rather than broken.
 */
function Thumbnail({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-md bg-muted",
          className,
        )}
      >
        <ImageIcon className="size-4 text-muted-foreground/60" aria-hidden />
      </div>
    );
  }

  return (
    <div className={cn("relative shrink-0 overflow-hidden rounded", className)}>
      <Image src={src} alt={alt} fill sizes="64px" className="object-cover" />
    </div>
  );
}

/**
 * Product reference card — the "what is this about" of an enquiry.
 *
 * Rendered in three places with the same component: pinned in the thread
 * header, inside the message that attached it, and in the composer as a
 * removable chip. `compact` covers the last of those.
 */
export function ProductRefCard({
  product,
  compact = false,
}: {
  product: ProductRefView;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border border-border bg-card dark:bg-background",
        compact ? "p-2" : "p-3",
      )}
    >
      <Thumbnail
        src={product.image}
        alt={product.name}
        className={compact ? "size-9" : "size-12"}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate font-medium",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {product.name}
        </p>
        <p
          className={cn(
            "font-semibold text-soraxi-green",
            compact ? "text-xs" : "text-sm",
          )}
        >
          {product.formattedPrice}
        </p>
      </div>
    </div>
  );
}

/** Status badge tone. Disputed is the one a shopper must not miss. */
function statusTone(status: string): string {
  const normalized = status.toLowerCase();

  if (normalized.includes("dispute") || normalized.includes("cancel")) {
    return "bg-soraxi-error/15 text-soraxi-error border-soraxi-error/30";
  }

  if (normalized.includes("deliver") && !normalized.includes("out_for")) {
    return "bg-soraxi-success/15 text-soraxi-success border-soraxi-success/30";
  }

  return "bg-muted text-muted-foreground border-border";
}

/** Turns `out_for_delivery` into `Out for delivery`. */
function humanizeStatus(status: string): string {
  const spaced = status.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/**
 * Order reference card.
 *
 * Shows up to three item thumbnails with a "+N" overflow, matching the design —
 * beyond three the strip stops being scannable and starts being a collage.
 */
export function OrderRefCard({ order }: { order: OrderRefView }) {
  const visible = order.thumbnails.slice(0, 3);
  const overflow = order.itemCount - visible.length;

  return (
    <div className="rounded-lg border border-border bg-card dark:bg-background p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="truncate font-mono text-xs font-medium sm:text-sm">
          {order.orderNumber}
        </span>
        <Badge
          variant="outline"
          className={cn("shrink-0 text-[10px]", statusTone(order.status))}
        >
          {humanizeStatus(order.status)}
        </Badge>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex shrink-0 items-center gap-1">
          {visible.map((src, i) => (
            <Thumbnail
              key={`${src}-${i}`}
              src={src}
              alt=""
              className="size-8"
            />
          ))}
          {overflow > 0 && (
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-medium text-muted-foreground">
              +{overflow}
            </div>
          )}
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold">{order.formattedTotal}</p>
          <p className="truncate text-xs text-muted-foreground">
            {order.itemCount} {order.itemCount === 1 ? "item" : "items"} ·{" "}
            {new Date(order.placedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
            })}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Whichever reference a message or thread carries, if any. */
export function ReferenceCard({
  product,
  order,
}: {
  product?: ProductRefView;
  order?: OrderRefView;
}) {
  if (product) return <ProductRefCard product={product} />;
  if (order) return <OrderRefCard order={order} />;
  return null;
}
