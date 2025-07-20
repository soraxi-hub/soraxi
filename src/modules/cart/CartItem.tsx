"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Minus, HeartIcon } from "lucide-react";
import { formatNaira } from "@/lib/utils/naira";

/**
 * Props interface for CartItem component
 */
interface CartItemProps {
  item: {
    id: string;
    productId: string;
    name: string;
    slug: string;
    image: string;
    price: number;
    quantity: number;
    size?: string;
    inStock: boolean;
    maxQuantity: number;
  };
  onUpdateQuantityAction: (id: string, quantity: number) => void;
  onRemoveItemAction: (id: string) => void;
  onMoveToWishlistAction: (id: string) => void;
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
  onMoveToWishlistAction,
}: CartItemProps) {
  // Local state for quantity input and loading states
  const [quantity, setQuantity] = useState(item.quantity);
  const [isUpdating, setIsUpdating] = useState(false);

  /**
   * Handle quantity changes with validation and loading states
   *
   * @param newQuantity - The new quantity value
   */
  const handleQuantityChange = async (newQuantity: number) => {
    // Validate quantity bounds
    if (newQuantity < 1 || newQuantity > item.maxQuantity) return;

    setIsUpdating(true);
    setQuantity(newQuantity);

    try {
      await onUpdateQuantityAction(item.productId, newQuantity);
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
    if (newQuantity >= 1 && newQuantity <= item.maxQuantity) {
      handleQuantityChange(newQuantity);
    }
  };

  // Calculate item subtotal
  const subtotal = item.price * quantity;

  return (
    <div className="flex gap-4 py-6 border-b">
      {/* Product Image with Stock Overlay */}
      <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-md border">
        <Link href={`/products/${item.slug}`}>
          <Image
            src={item.image || "/placeholder.svg"}
            alt={item.name}
            fill
            className="object-cover hover:scale-105 transition-transform"
          />
        </Link>
        {!item.inStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Badge variant="destructive" className="text-xs">
              Out of Stock
            </Badge>
          </div>
        )}
      </div>

      {/* Product Details and Controls */}
      <div className="flex flex-1 flex-col justify-between">
        {/* Product Information */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <div>
              <Link href={`/products/${item.slug}`}>
                <h3 className="font-medium hover:text-primary transition-colors line-clamp-2">
                  {item.name}
                </h3>
              </Link>
            </div>
            <div className="text-right">
              <p className="font-semibold">{formatNaira(subtotal)}</p>
            </div>
          </div>

          {/* Product Variants */}
          <div className="flex gap-2 text-sm text-muted-foreground">
            {item.size && <span>Size: {item.size}</span>}
          </div>

          <p className="text-sm text-muted-foreground">
            {formatNaira(item.price)} each
          </p>
        </div>

        {/* Quantity Controls and Actions */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            {/* Quantity Input with Controls */}
            <div className="flex items-center border rounded-md">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuantityChange(quantity - 1)}
                disabled={quantity <= 1 || isUpdating || !item.inStock}
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
                max={item.maxQuantity}
                disabled={isUpdating || !item.inStock}
              />

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleQuantityChange(quantity + 1)}
                disabled={
                  quantity >= item.maxQuantity || isUpdating || !item.inStock
                }
                className="h-8 w-8 p-0"
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {/* Low Stock Warning */}
            {item.maxQuantity <= 20 && (
              <p className="text-xs text-orange-600">
                Only {item.maxQuantity} left
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onMoveToWishlistAction(item.id)}
              className="text-muted-foreground hover:text-primary"
            >
              <HeartIcon className="h-4 w-4 mr-1" />
              Save
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRemoveItemAction(item.id)}
              className="text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>

        {/* Out of Stock Warning */}
        {!item.inStock && (
          <p className="text-sm text-destructive mt-2">
            This item is currently out of stock
          </p>
        )}
      </div>
    </div>
  );
}
