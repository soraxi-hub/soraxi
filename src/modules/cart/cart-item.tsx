"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Plus,
  Minus,
  // HeartIcon
} from "lucide-react";
import { formatNaira } from "@/lib/utils/naira";
import { siteConfig } from "@/config/site";
import { IPopulatedCartInfo } from "@/domain/cart/cart-interface";

/**
 * Props interface for CartItem component
 */
interface CartItemProps {
  item: IPopulatedCartInfo["items"][number];
  onUpdateQuantityAction: (id: string, quantity: number) => void;
  onRemoveItemAction: (id: string) => void;
}

/**
 * CartItem Component
 *
 * Renders an individual cart item with:
 * - Product image and details
 * - Quantity controls with validation
 * - Price calculations
 * - Action buttons (remove, save to wishlist)
 * - Stock status indicators
 *
 * Features optimistic UI updates and proper loading states
 * for better user experience during server operations.
 */
export function CartItem({
  item,
  onUpdateQuantityAction,
  onRemoveItemAction,
}: CartItemProps) {
  // Local state for quantity input and loading states
  const [quantity, setQuantity] = useState(item.quantity);
  const [isUpdating, setIsUpdating] = useState(false);
  const { price, productId, name, image, slug, inStock, productQuantity } =
    item.product;

  /**
   * Handle quantity changes with validation and loading states
   *
   * @param newQuantity - The new quantity value
   */
  const handleQuantityChange = async (newQuantity: number) => {
    // Validate quantity bounds
    if (newQuantity < 1 || newQuantity > productQuantity) return;

    setIsUpdating(true);
    setQuantity(newQuantity);

    try {
      onUpdateQuantityAction(productId, newQuantity);
    } catch (error) {
      // Rollback on error
      setQuantity(item.quantity);
    } finally {
      setIsUpdating(false);
    }
  };

  /**
   * Handle direct input changes in quantity field
   *
   * @param value - String value from input field
   */
  const handleInputChange = (value: string) => {
    const newQuantity = Number.parseInt(value) || 1;
    if (newQuantity >= 1 && newQuantity <= productQuantity) {
      handleQuantityChange(newQuantity);
    }
  };

  // Calculate item subtotal
  const subtotal = price * quantity;

  return (
    <div className="flex flex-col sm:flex-row gap-4 py-6 border-b">
      {/* Product Image with Stock Overlay */}
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border">
        <Link href={`/products/${slug}`}>
          <Image
            src={image || siteConfig.placeHolderImg}
            alt={name}
            fill
            className="object-cover hover:scale-105 transition-transform"
          />
        </Link>
        {!inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive" className="text-xs">
              Out of Stock
            </Badge>
          </div>
        )}
      </div>

      {/* Product Details and Controls */}
      <div className="flex flex-1 flex-col justify-between min-w-0">
        {/* Product Information */}
        <div className="space-y-1 min-w-0">
          <div className="flex justify-between items-start gap-2">
            <div className="min-w-0 flex-1">
              <Link href={`/products/${slug}`}>
                <h3 className="font-medium hover:text-primary transition-colors line-clamp-2 truncate">
                  {name}
                </h3>
              </Link>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-semibold truncate max-w-[100px] sm:max-w-[150px]">
                {formatNaira(subtotal)}
              </p>
            </div>
          </div>

          <p className="text-sm text-muted-foreground truncate max-w-[160px] sm:max-w-[200px]">
            {formatNaira(price)} each
          </p>
        </div>

        {/* Quantity Controls and Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-4 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {/* Quantity Input with Controls */}
            <div className="flex items-center border rounded-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1 || isUpdating || !inStock}
                className="h-8 w-8 p-0"
              >
                <Minus className="h-3 w-3" />
              </Button>

              <Input
                type="number"
                value={quantity}
                onChange={(e) => handleInputChange(e.target.value)}
                className="h-8 w-16 text-center border-0 focus-visible:ring-0"
                min={1}
                max={productQuantity}
                disabled={isUpdating || !inStock}
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={quantity >= productQuantity || isUpdating || !inStock}
                className="h-8 w-8 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* Low Stock Warning */}
            {productQuantity <= 20 && (
              <p className="text-xs text-orange-600 hidden sm:inline truncate">
                Only {productQuantity} left
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* <Button
          variant="ghost"
          size="sm"
          onClick={() => onMoveToWishlistAction(item.id)}
          className="text-muted-foreground hover:text-primary"
        >
          <HeartIcon className="h-4 w-4 mr-1" />
          Save
        </Button> */}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveItemAction(productId)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>

        {/* Out of Stock Warning */}
        {!inStock && (
          <p className="text-sm text-destructive mt-2 truncate">
            This item is currently out of stock
          </p>
        )}
      </div>
    </div>
  );
}
