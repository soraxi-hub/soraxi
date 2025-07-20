import { TRPCError } from "@trpc/server";
import { createTRPCRouter, baseProcedure } from "@/trpc/init";

import { getCartModel, ICart } from "@/lib/db/models/cart.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { currencyOperations } from "@/lib/utils/naira";
import { z } from "zod";
import { CartProduct } from "@/types";
import mongoose from "mongoose";
import { getProductModel } from "@/lib/db/models/product.model";

export const checkoutRouter = createTRPCRouter({
  /**
   * Retrieves a grouped cart for the authenticated user.
   * - Groups products by store
   * - Fetches shipping methods per store
   * - Calculates total price and quantity
   */
  getGroupedCart: baseProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .query(async (input) => {
      const { userId } = input.input;
      console.log("userId", userId);
      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const Cart = await getCartModel();
      const Store = await getStoreModel();

      // 📦 Fetch the user's cart and populate product references
      const cart = await Cart.findOne<ICart>({
        user: new mongoose.Types.ObjectId(userId),
      })
        .populate({
          path: "items.product",
          select: "_id name price images sizes productType category storeID",
        })
        .lean();

      if (!cart || cart.items.length === 0) {
        return {
          success: true,
          totalQuantity: 0,
          totalPrice: 0,
          groupedCart: [],
        };
      }

      // console.log("cart", cart);

      let totalPrice = 0;
      let totalQuantity = 0;

      // 🧠 Group cart items by store
      const groupedByStore: Record<
        string,
        {
          product: CartProduct; // Populated product
          quantity: number;
          selectedSize?: {
            size: string;
            price: number;
            quantity: number;
          };
          productType: "Product" | "digitalproducts";
          storeID: string;
          // _id: string;
        }[]
      > = {};

      for (const item of cart.items) {
        const storeID = item.storeID.toString();

        if (!groupedByStore[storeID]) {
          groupedByStore[storeID] = [];
        }

        groupedByStore[storeID].push({
          // _id: item._id.toString(),
          product: {
            ...item.product,
            storeID: (
              item.product as unknown as CartProduct
            ).storeID.toString(),
            _id: item.product._id.toString(),
          } as unknown as CartProduct,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          productType: item.productType,
          storeID,
        });

        const itemPrice = (item.product as unknown as CartProduct)?.price ?? 0;

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

      for (const storeID of Object.keys(groupedByStore)) {
        const store = await Store.findById(storeID).select(
          "name shippingMethods"
        );
        if (store) {
          storeShipping[storeID] = {
            name: store.name,
            shippingMethods: store.shippingMethods,
          };
        }
      }

      // console.log("storeShipping", storeShipping);

      // 🧾 Format grouped cart by store
      const groupedCart = Object.keys(groupedByStore).map((storeID) => ({
        storeID,
        storeName:
          storeShipping[storeID]?.name || `Store ${storeID.slice(0, 5)}`,
        products: groupedByStore[storeID],
        shippingMethods: storeShipping[storeID]?.shippingMethods || [],
      }));

      // console.log("groupedCart", groupedCart);

      return {
        success: true,
        totalQuantity,
        totalPrice,
        groupedCart,
      };
    }),

  validateUserCart: baseProcedure
    .input(
      z.object({
        userId: z.string(),
      })
    )
    .mutation(async (input) => {
      const { userId } = input.input;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        });
      }

      const Cart = await getCartModel();
      const Product = await getProductModel();

      const cart = await Cart.findOne<ICart>({
        user: new mongoose.Types.ObjectId(userId),
      })
        .populate({
          path: "items.product",
          select: "_id name price productQuantity sizes",
        })
        .lean();

      if (!cart || cart.items.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cart is empty",
        });
      }

      const validationErrors: string[] = [];

      for (const item of cart.items) {
        const product = await Product.findById(item.product._id).lean();

        if (!product) {
          validationErrors.push(`Product no longer exists in catalog.`);
          continue;
        }

        // console.log("product", product);

        // Handle size-based products
        if (item.selectedSize !== undefined) {
          const size = product.sizes?.find(
            (s: { size: string }) => s.size === item.selectedSize!.size
          );

          if (!size) {
            validationErrors.push(
              `Size ${item.selectedSize.size} no longer available for ${product.name}`
            );
            continue;
          }

          if (size.quantity < item.quantity) {
            validationErrors.push(
              `Insufficient stock for ${product.name} (Size: ${item.selectedSize.size}). Available: ${size.quantity}, Requested: ${item.quantity}`
            );
          }
        } else {
          // Non-size-based products
          if (product.productQuantity < item.quantity) {
            validationErrors.push(
              `Insufficient stock for ${product.name}. Available: ${product.productQuantity}, Requested: ${item.quantity}`
            );
          }
        }
      }

      // if (validationErrors.length > 0) {
      //   throw new TRPCError({
      //     code: "BAD_REQUEST",
      //     message: "Some cart items are invalid",
      //     cause: validationErrors,
      //   });
      // }

      return {
        success: true,
        isValid: validationErrors.length > 0 ? false : true,
        validationErrors: validationErrors,
      };
    }),
});
