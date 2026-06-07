import { ProductStatusEnum, ProductTypeEnum } from "@/enums";
import { ICartItem } from "@/lib/db/models/cart.model";
import { Size } from "@/lib/db/models/product.model";

export interface ICartItemInfo
  extends Omit<ICartItem, "productId" | "storeId"> {
  productId: string;
  storeId: string;
}

export interface ICartInfo {
  cartId: string | undefined;
  userId: string;
  items: ICartItemInfo[];
  totalItems: number;
  totalUniqueItems: number;
  idempotencyKey?: string;
  createdAt: Date | undefined;
  updatedAt: Date | undefined;
}

// New interface for the enriched version
export interface IPopulatedCartItem
  extends Omit<ICartItem, "productId" | "storeId"> {
  product: {
    productId: string;
    storeId: string;
    name: string;
    image: string;
    price: number;
    sizes: Size[];
    category: string[];
    slug: string;
    status: ProductStatusEnum;
    productType: ProductTypeEnum;
    productQuantity: number;
    inStock: boolean;
  };
  productId: string;
  storeId: string;
}

export interface IPopulatedCartInfo extends Omit<ICartInfo, "items"> {
  items: IPopulatedCartItem[];
  subtotal: number;
  itemCount: number;
  productCount: number;
}

export interface CartValidationResult {
  success: true;
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Extracted into a standalone reusable type to avoid circular type references.
 *
 * Previously, this type was being inferred from CheckoutData using:
 * CheckoutData["cartData"]["groupedCart"][number]
 *
 * But CheckoutData itself indirectly depended on payment-related types
 * that referenced this structure again, creating a recursive type loop.
 *
 * Defining it separately keeps the domain model cleaner, reusable,
 * and prevents TypeScript circular inference issues.
 */
export type GroupedCartItem = {
  totalQuantity: number;
  totalPrice: number;
  groupedCart: {
    storeId: string;
    storeName: string;
    products: IPopulatedCartItem[];
    shippingMethods: {
      name: string;
      price: number;
      estimatedDeliveryDays?: number;
      isActive?: boolean;
      description?: string;
    }[];
  }[];
};

export type GroupedCartStoreItem = GroupedCartItem["groupedCart"][number];
