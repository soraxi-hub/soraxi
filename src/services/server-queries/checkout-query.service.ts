/**
 * CheckoutQueryService
 * --------------------------------------
 * Handles all read-only checkout-related queries:
 * - Grouped cart retrieval
 * - Cart validation before checkout
 */

import mongoose from "mongoose";
import { TRPCError } from "@trpc/server";

import { getCartModel, type ICart } from "@/lib/db/models/cart.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { getProductModel, type IProduct } from "@/lib/db/models/product.model";

import { currencyOperations } from "@/lib/utils/naira";
import { StoreStatusEnum } from "@/validators/store-validators";
import { ProductTypeEnum } from "@/validators/product-validators";
import type { CartProduct } from "@/types";

/**
 * Result returned after validating a user's cart
 */
export interface CartValidationResult {
  success: true;
  isValid: boolean;
  validationErrors: string[];
}

/**
 * CheckoutQueryService
 *
 * This class contains all checkout-related read & validation logic.
 */
export class CheckoutQueryService {
  /**
   * Retrieves a grouped cart for the authenticated user.
   * - Groups products by store
   * - Fetches shipping methods per store
   * - Calculates total price and quantity
   *
   * @param userId - Authenticated user's ID
   */
  static async getGroupedCart(userId: string) {
    const Cart = await getCartModel();
    const Store = await getStoreModel();
    await getProductModel();

    // Fetch the user's cart and populate product references
    const cart = await Cart.findOne<ICart>({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .populate({
        path: "items.productId",
        select: "_id name price images sizes productType category storeId",
      })
      .lean();

    // Return empty structure when cart is empty or not found
    if (!cart || cart.items.length === 0) {
      return {
        success: true,
        totalQuantity: 0,
        totalPrice: 0,
        groupedCart: [],
      };
    }

    let totalPrice = 0;
    let totalQuantity = 0;

    // Group cart items by store
    const groupedByStore: Record<
      string,
      {
        product: CartProduct;
        quantity: number;
        selectedSize?: { size: string; price: number; quantity: number };
        productType: ProductTypeEnum;
        storeId: string;
      }[]
    > = {};

    for (const item of cart.items) {
      const storeId = item.storeId.toString();

      if (!groupedByStore[storeId]) groupedByStore[storeId] = [];

      groupedByStore[storeId].push({
        product: {
          ...(item.productId as unknown as CartProduct),
          storeId: (
            item.productId as unknown as CartProduct
          ).storeId.toString(),
          _id: item.productId._id.toString(),
        },
        quantity: item.quantity,
        selectedSize: item.selectedSize,
        productType: item.productType,
        storeId,
      });

      const itemPrice = (item.productId as unknown as CartProduct)?.price ?? 0;

      totalPrice = currencyOperations.add(
        totalPrice,
        currencyOperations.multiply(itemPrice, item.quantity)
      );

      totalQuantity += item.quantity;
    }

    // Fetch shipping methods per store
    const storeShipping: Record<
      string,
      {
        name: string;
        shippingMethods: {
          name: string;
          price: number;
          estimatedDeliveryDays?: number;
          isActive?: boolean;
          description?: string;
          applicableRegions?: string[];
          conditions?: {
            minOrderValue?: number;
            maxOrderValue?: number;
            minWeight?: number;
            maxWeight?: number;
          };
        }[];
      }
    > = {};

    for (const storeId of Object.keys(groupedByStore)) {
      const store = await Store.findById(storeId).select(
        "name shippingMethods"
      );

      if (store) {
        storeShipping[storeId] = {
          name: store.name,
          shippingMethods: store.shippingMethods,
        };
      }
    }

    // Format grouped cart by store
    const groupedCart = Object.keys(groupedByStore).map((storeId) => ({
      storeId,
      storeName: storeShipping[storeId]?.name || `Store ${storeId.slice(0, 5)}`,
      products: groupedByStore[storeId],
      shippingMethods: storeShipping[storeId]?.shippingMethods || [],
    }));

    return {
      success: true,
      totalQuantity,
      totalPrice,
      groupedCart,
    };
  }

  /**
   * Group products by their store and validate that:
   * - All products still exist and have enough stock
   * - The store is active (not suspended, pending, or rejected)
   *
   * @param userId - Authenticated user's ID
   */
  static async validateUserCart(userId: string): Promise<CartValidationResult> {
    // --- Step 1: Initialize models ---
    const Cart = await getCartModel();
    const Store = await getStoreModel();
    await getProductModel();

    // Container for validation issues
    const validationErrors: string[] = [];

    // Map storeId -> array of products in that store
    const groupedByStore: Record<string, { productId: string }[]> = {};

    // --- Step 2: Fetch user's cart with product details ---
    const cart = await Cart.findOne<ICart>({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .populate({
        path: "items.productId",
        select: "_id name price productQuantity sizes",
      })
      .lean();

    // If cart is missing or empty, return early
    if (!cart || cart.items.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cart is empty",
      });
    }

    // --- Step 3: Validate product existence, sizes, and stock ---
    for (const item of cart.items) {
      const storeId = item.storeId.toString();
      const product = item.productId as unknown as
        | (IProduct & { _id: mongoose.Types.ObjectId })
        | null;

      // Product deleted from catalog
      if (!product) {
        validationErrors.push(
          "A product in your cart no longer exists in the catalog."
        );
        continue;
      }

      if (!groupedByStore[storeId]) groupedByStore[storeId] = [];

      groupedByStore[storeId].push({
        productId: product._id.toString(),
      });

      // Size-based validation
      if (item.selectedSize) {
        const size = product.sizes?.find(
          (s: { size: string }) => s.size === item.selectedSize!.size
        );

        if (!size) {
          validationErrors.push(
            `Size ${item.selectedSize.size} is no longer available for ${product.name}.`
          );
          continue;
        }

        if (size.quantity < item.quantity) {
          validationErrors.push(
            `Insufficient stock for ${product.name} (Size: ${item.selectedSize.size}).`
          );
        }
      } else {
        // Non-size-based validation
        if (
          product.productQuantity != null &&
          product.productQuantity < item.quantity
        ) {
          validationErrors.push(`Insufficient stock for ${product.name}.`);
        }
      }
    }

    // --- Step 4: Validate associated stores ---
    const storeIds = Object.keys(groupedByStore);

    const stores = await Store.find({
      _id: { $in: storeIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select("status name")
      .lean();

    const storeMap = new Map(stores.map((s) => [s._id.toString(), s]));

    for (const storeId of storeIds) {
      const store = storeMap.get(storeId);

      if (!store) {
        validationErrors.push("One of the selected stores could not be found.");
        continue;
      }

      if (store.status !== StoreStatusEnum.Active) {
        validationErrors.push(
          `The store "${store.name}" is not active and cannot accept new orders.`
        );
      }
    }

    // --- Step 5: Return structured validation result ---
    return {
      success: true,
      isValid: validationErrors.length === 0,
      validationErrors,
    };
  }
}
