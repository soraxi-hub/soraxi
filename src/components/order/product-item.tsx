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
import { ClipboardEditIcon, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Product {
  Product: {
    _id: string;
    name: string;
    images?: string[];
  };
  quantity: number;
}

interface ProductItemProps {
  product: Product;
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
  onReturnInitAction,
  deliveryStatus,
  returnWindow,
}: ProductItemProps) {
  if (!product.Product) return null;

  // Check if return window is still valid
  const isReturnWindowValid = returnWindow
    ? new Date() <= new Date(returnWindow)
    : false;
  const canReturn = deliveryStatus === "Delivered" && isReturnWindowValid;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 p-0">
      <div className="relative overflow-hidden rounded-t-lg">
        <Image
          src={
            product.Product.images?.[0] ||
            "/placeholder.svg?height=200&width=300"
          }
          height={200}
          width={300}
          alt={product.Product.name}
          className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <CardContent className="pb-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-soraxi-green transition-colors">
            {product.Product.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            Quantity: {product.quantity}
          </p>

          {/* Action Buttons */}
          <div className="space-y-2">
            {deliveryStatus === "Delivered" && (
              <Button
                className="mt-2 bg-soraxi-green hover:bg-soraxi-green-hover text-white w-full text-sm flex items-center gap-2"
                onClick={() => onReviewInitAction(product.Product._id)}
                aria-label="Review product"
                size="sm"
              >
                <ClipboardEditIcon className="h-4 w-4" />
                Write Review
              </Button>
            )}

            {!canReturn && (
              <Button
                variant="outline"
                className="w-full text-sm flex items-center gap-2 border-orange-200 text-orange-700 hover:bg-orange-50 bg-transparent"
                onClick={() =>
                  onReturnInitAction({
                    _id: product.Product._id,
                    name: product.Product.name,
                    quantity: product.quantity,
                    images: product.Product.images,
                  })
                }
                aria-label="Request return"
                size="sm"
              >
                <RotateCcw className="h-4 w-4" />
                Request Return
              </Button>
            )}

            {deliveryStatus === "Delivered" && !isReturnWindowValid && (
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
