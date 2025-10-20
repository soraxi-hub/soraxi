import { TRPCError } from "@trpc/server";
import { createTRPCRouter, baseProcedure } from "@/trpc/init";

import { getCartModel, ICart } from "@/lib/db/models/cart.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { currencyOperations } from "@/lib/utils/naira";
import { CartProduct } from "@/types";
import mongoose from "mongoose";
import { IProduct } from "@/lib/db/models/product.model";
import { StoreStatusEnum } from "@/validators/store-validators";
import { ProductTypeEnum } from "@/validators/product-validators";
import { handleTRPCError } from "@/lib/utils/handle-trpc-error";

export const checkoutRouter = createTRPCRouter({
  /**
   * Retrieves a grouped cart for the authenticated user.
   * - Groups products by store
   * - Fetches shipping methods per store
   * - Calculates total price and quantity
   */
  getGroupedCart: baseProcedure.query(async ({ ctx }) => {
    try {
      const { user } = ctx;

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const Cart = await getCartModel();
      const Store = await getStoreModel();

      // 📦 Fetch the user's cart and populate product references
      const cart = await Cart.findOne<ICart>({
        userId: new mongoose.Types.ObjectId(user.id),
      })
        .populate({
          path: "items.productId",
          select: "_id name price images sizes productType category storeId",
        })
        .lean();

      // 🧩 Return empty structure when cart is empty or not found
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

      // 🧠 Group cart items by store
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
            ...item.productId,
            storeId: (
              item.productId as unknown as CartProduct
            ).storeId.toString(),
            _id: item.productId._id.toString(),
          } as unknown as CartProduct,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          productType: item.productType,
          storeId,
        });

        const itemPrice =
          (item.productId as unknown as CartProduct)?.price ?? 0;

        totalPrice = currencyOperations.add(
          totalPrice,
          currencyOperations.multiply(itemPrice, item.quantity)
        );

        totalQuantity += item.quantity;
      }

      // 🚚 Fetch shipping methods per store
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

      // 🧾 Format grouped cart by store
      const groupedCart = Object.keys(groupedByStore).map((storeId) => ({
        storeId,
        storeName:
          storeShipping[storeId]?.name || `Store ${storeId.slice(0, 5)}`,
        products: groupedByStore[storeId],
        shippingMethods: storeShipping[storeId]?.shippingMethods || [],
      }));

      return {
        success: true,
        totalQuantity,
        totalPrice,
        groupedCart,
      };
    } catch (error) {
      // Use centralized handler for all runtime & DB errors
      handleTRPCError(error);
    }
  }),

  /**
   * Group products by their store and validate that:
   * - All products still exist and have enough stock
   * - The store is active (not suspended, pending, or rejected)
   */
  validateUserCart: baseProcedure.mutation(async ({ ctx }) => {
    try {
      const { user } = ctx;

      // --- Step 0: Ensure user is authenticated ---
      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      // --- Step 1: Initialize models ---
      const Cart = await getCartModel();
      const Store = await getStoreModel();

      // Container for validation issues
      const validationErrors: string[] = [];

      // Map storeId -> array of products in that store
      const groupedByStore: Record<string, { productId: string }[]> = {};

      // --- Step 2: Fetch user's cart with product details ---
      const cart = await Cart.findOne<ICart>({
        userId: new mongoose.Types.ObjectId(user.id),
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

        if (!groupedByStore[storeId]) {
          groupedByStore[storeId] = [];
        }

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
              `Insufficient stock for ${product.name} (Size: ${item.selectedSize.size}). Available: ${size.quantity}, Requested: ${item.quantity}.`
            );
          }
        } else {
          // Non-size-based validation
          if (
            product.productQuantity != null &&
            product.productQuantity < item.quantity
          ) {
            validationErrors.push(
              `Insufficient stock for ${product.name}. Available: ${product.productQuantity}, Requested: ${item.quantity}.`
            );
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
          validationErrors.push(
            "One of the selected stores could not be found. Please check and try again."
          );
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
    } catch (error) {
      handleTRPCError(error);
    }
  }),
});
