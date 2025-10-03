"use client";

/**
 * Product Item Component
 *
 * Displays a single product from an order with its image, details,
 * deal information, and buttons for reviews and returns if delivered.
 *
 * @component ProductItem
 */

import Image from "next/image";
import { ClipboardEditIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { AppRouter } from "@/trpc/routers/_app";
import type { inferProcedureOutput } from "@trpc/server";
import { DeliveryStatus } from "@/enums";
import { siteConfig } from "@/config/site";

type ProductsOutput = inferProcedureOutput<AppRouter["order"]["getByOrderId"]>;

interface ProductItemProps {
  product: ProductsOutput["subOrders"][number]["products"][number];
  onReviewInitAction: (id: string) => void;
  onReturnInitAction: (product: {
    _id: string;
    name: string;
    quantity: number;
    images?: string[];
  }) => void;
  deliveryStatus?: string;
  subOrderId?: string;
  returnWindow?: Date;
}

export function ProductItem({
  product,
  onReviewInitAction,
  // onReturnInitAction,
  deliveryStatus,
  returnWindow,
}: ProductItemProps) {
  if (!product.productSnapshot) return null;

  // Check if return window is still valid
  const isReturnWindowValid = returnWindow
    ? new Date() <= new Date(returnWindow)
    : false;
  // const canReturn = deliveryStatus === "Delivered" && isReturnWindowValid;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-0">
      <div className="relative overflow-hidden rounded-t-lg">
        <Image
          src={
            product.productSnapshot.images?.[0] || siteConfig.placeHolderImg1
          }
          height={200}
          width={300}
          alt={product.productSnapshot.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardContent className="pb-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-soraxi-green transition-colors">
            {product.productSnapshot.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            Quantity: {product.productSnapshot.quantity}
          </p>

          {/* Action Buttons */}
          <div className="space-y-2">
            {deliveryStatus === DeliveryStatus.Delivered && (
              <Button
                className="mt-2 bg-soraxi-green hover:bg-soraxi-green-hover text-white w-full text-sm flex items-center gap-2"
                onClick={() => onReviewInitAction(product.productSnapshot._id)}
                aria-label="Review product"
                size="sm"
              >
                <ClipboardEditIcon className="h-4 w-4" />
                Write Review
              </Button>
            )}

            {/* {!canReturn && (
              <Button
                variant="outline"
                className="w-full text-sm flex items-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 bg-transparent"
                onClick={() =>
                  onReturnInitAction({
                    _id: product.productSnapshot._id,
                    name: product.productSnapshot.name,
                    quantity: product.productSnapshot.quantity,
                    images: product.productSnapshot.images,
                  })
                }
                aria-label="Request return"
                size="sm"
              >
                <RotateCcw className="h-4 w-4" />
                Request Return
              </Button>
            )} */}

            {deliveryStatus === DeliveryStatus.Delivered &&
              !isReturnWindowValid && (
                <p className="text-xs text-muted-foreground text-center">
                  Return window expired
                </p>
              )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
