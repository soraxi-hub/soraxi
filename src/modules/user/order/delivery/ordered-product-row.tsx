"use client";

import { Flag, ImageIcon, Pencil } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatNaira } from "@/lib/utils/naira";
import { MessageAboutOrderButton } from "@/modules/messaging/components/message-about-order-button";
import type { AppRouter } from "@/trpc/routers/_app";
import type { inferProcedureOutput } from "@trpc/server";

type OrderOutput = inferProcedureOutput<AppRouter["order"]["getByOrderId"]>;
type OrderedProduct = OrderOutput["subOrders"][number]["products"][number];

interface OrderedProductRowProps {
  product: OrderedProduct;
  canMessageVendor: boolean;
  subOrderId: string;
  /** Dispute and review are only offered once the item has actually arrived. */
  canDispute: boolean;
  canReview: boolean;
  onDispute: () => void;
  onReview: (productId: string) => void;
}

/**
 * One ordered item, as a row.
 *
 * This replaces a 300px card per product in a two-column grid. On a 375px
 * screen that grid was one column, so three items meant roughly a full screen
 * of scrolling to read three names — the image dominated, and the image is the
 * one thing a customer looking at their own order already recognises. The row
 * puts the name, price and quantity on one line and keeps the actions at a
 * constant position down the list, so they can be found without hunting.
 *
 * The three actions differ in scope, which is worth knowing when reading this:
 * **review** is per product, while **dispute** and **message** are per
 * sub-order. Offering the latter two on each row is deliberate — a customer
 * reasons "this item is wrong", not "sub-order 3 is wrong" — but pressing flag
 * on any row of the same store opens the same dispute.
 */
export function OrderedProductRow({
  product,
  subOrderId,
  canMessageVendor,
  canDispute,
  canReview,
  onDispute,
  onReview,
}: OrderedProductRowProps) {
  const snapshot = product.productSnapshot;
  if (!snapshot) return null;

  const image = snapshot.images?.[0];
  const quantity = snapshot.quantity ?? 0;
  const lineTotal = (snapshot.price ?? 0) * quantity;

  return (
    <li className="flex items-center gap-3 py-3">
      <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="size-full object-cover" />
        ) : (
          <ImageIcon className="size-4 text-muted-foreground/60" aria-hidden />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{snapshot.name}</p>
        <p className="flex flex-wrap items-center gap-x-1.5 text-xs">
          <span className="text-soraxi-green">{formatNaira(lineTotal)}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">Qty {quantity}</span>
        </p>
      </div>

      {/*
        Fixed-width icon column. The actions never wrap under the name, because
        a row whose height changes with the length of a product title makes the
        list impossible to scan.
      */}
      <div className="flex shrink-0 items-center gap-0.5">
        {canDispute && (
          <RowAction
            label="Raise a dispute"
            onClick={onDispute}
            className="hover:text-soraxi-error"
          >
            <Flag className="size-4" />
          </RowAction>
        )}

        {canMessageVendor && (
          <MessageAboutOrderButton
            subOrderId={subOrderId}
            role="customer"
            label="Message vendor"
            iconOnly
          />
        )}

        {canReview && (
          <RowAction
            label={`Write a review for ${snapshot.name}`}
            onClick={() => onReview(snapshot._id.toString())}
          >
            <Pencil className="size-4" />
          </RowAction>
        )}
      </div>
    </li>
  );
}

/**
 * Icon actions are 32px targets sitting in a 48px-tall row, which keeps the
 * touch area comfortable without the row growing on mobile.
 */
function RowAction({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        "size-8 shrink-0 text-muted-foreground hover:text-soraxi-green",
        className,
      )}
    >
      {children}
    </Button>
  );
}
