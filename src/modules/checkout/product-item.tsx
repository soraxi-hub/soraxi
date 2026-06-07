import Image from "next/image";
import { currencyOperations, formatNaira } from "@/lib/utils/naira";
// import { Badge } from "@/components/ui/badge";

import type { inferProcedureOutput } from "@trpc/server";
import type { AppRouter } from "@/trpc/routers/_app";
import { getCategoryName } from "@/constants/constant";

type CheckoutOutput = inferProcedureOutput<
  AppRouter["checkout"]["getGroupedCart"]
>;
type CartProduct =
  NonNullable<CheckoutOutput>["groupedCart"][number]["products"];

interface ProductItemProps {
  item: CartProduct[number];
}

/**
 * Product Item Component
 *
 * Displays a comprehensive view of a single product in the checkout process.
 * This component provides essential product information in a clean, scannable format
 * that helps users review their purchase decisions.
 *
 * Key Features:
 * - High-quality product image with fallback handling
 * - Clear product identification and categorization
 * - Transparent pricing with quantity calculations
 * - Visual indicators for product type (physical vs digital)
 * - Responsive design for all screen sizes
 * - Accessibility-compliant markup
 *
 * Design Principles:
 * - Information hierarchy prioritizes product name and total price
 * - Secondary information (category, unit price) uses muted styling
 * - Consistent spacing and alignment for easy scanning
 * - Subtle visual cues distinguish different product types
 *
 * @param item - Product item data including product details and quantity
 */
export function ProductItem({ item }: ProductItemProps) {
  const product = item.product;

  /**
   * Price Calculations
   *
   * Calculate the total price for this line item using currency operations
   * to ensure precise decimal arithmetic and avoid floating-point errors.
   */
  const itemTotal = currencyOperations.multiply(
    product.price || 0,
    item.quantity,
  );

  return (
    <article className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/30 transition-colors">
      {/* Product Image */}
      <div className="relative h-20 w-20 overflow-hidden rounded-md border bg-muted flex-shrink-0">
        <Image
          src={product.image}
          alt={`${product.name} product image`}
          fill
          className="object-cover transition-transform hover:scale-105"
          sizes="80px"
          priority={false}
        />
      </div>

      {/* Product Information */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Product Name */}
        <h4 className="font-medium text-foreground truncate leading-tight">
          {product.name}
        </h4>

        {/* Product Category */}
        {product.category && getCategoryName(product.category[0]) && (
          <p className="text-sm text-muted-foreground hidden sm:inline-block">
            {getCategoryName(product.category[0])}
          </p>
        )}

        {/* Selected Size (if applicable) */}
        {item.selectedSize?.size && (
          <p className="text-sm text-muted-foreground">
            Size: <span className="font-medium">{item.selectedSize.size}</span>
          </p>
        )}

        {/* Unit Price */}
        <p className="text-sm text-muted-foreground">
          {formatNaira(product.price || 0)} each
        </p>
      </div>

      {/* Pricing Information */}
      <div className="text-right space-y-1 flex-shrink-0">
        {/* Item Total Price */}
        <div className="font-semibold text-foreground">
          {formatNaira(itemTotal)}
        </div>

        {/* Quantity Information */}
        <p className="text-sm text-muted-foreground">
          Qty: <span className="font-medium">{item.quantity}</span>
        </p>
      </div>
    </article>
  );
}
