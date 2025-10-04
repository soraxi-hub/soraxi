import { TRPCError } from "@trpc/server";
import { createTRPCRouter, baseProcedure } from "@/trpc/init";

import { getCartModel, ICart } from "@/lib/db/models/cart.model";
import { getStoreModel } from "@/lib/db/models/store.model";
import { currencyOperations } from "@/lib/utils/naira";
import { CartProduct } from "@/types";
import mongoose from "mongoose";
import { IProduct } from "@/lib/db/models/product.model";
import { StoreStatusEnum } from "@/validators/store-validators";

export const checkoutRouter = createTRPCRouter({
  /**
   * Retrieves a grouped cart for the authenticated user.
   * - Groups products by store
   * - Fetches shipping methods per store
   * - Calculates total price and quantity
   */
  getGroupedCart: baseProcedure.query(async ({ ctx }) => {
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
        storeId: string;
        // _id: string;
      }[]
    > = {};

    for (const item of cart.items) {
      const storeId = item.storeId.toString();

      if (!groupedByStore[storeId]) {
        groupedByStore[storeId] = [];
      }

      groupedByStore[storeId].push({
        // _id: item._id.toString(),
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

      const itemPrice = (item.productId as unknown as CartProduct)?.price ?? 0;

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

    // console.log("storeShipping", storeShipping);

    // 🧾 Format grouped cart by store
    const groupedCart = Object.keys(groupedByStore).map((storeId) => ({
      storeId,
      storeName: storeShipping[storeId]?.name || `Store ${storeId.slice(0, 5)}`,
      products: groupedByStore[storeId],
      shippingMethods: storeShipping[storeId]?.shippingMethods || [],
    }));

    // console.log("groupedCart", groupedCart);

    return {
      success: true,
      totalQuantity,
      totalPrice,
      groupedCart,
    };
  }),

  /**
   * Group products by their store and validate that:
   * - All products still exist and have enough stock
   * - The store is active (not suspended, pending, or rejected)
   */
  validateUserCart: baseProcedure.mutation(async ({ ctx }) => {
    const { user } = ctx;

    // Ensure user is logged in
    if (!user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "User not authenticated",
      });
    }

    // Initialize models
    const Cart = await getCartModel();
    const Store = await getStoreModel();

    // Container for validation issues
    const validationErrors: string[] = [];

    // Map storeId -> array of products in that store
    const groupedByStore: Record<string, { productId: string }[]> = {};

    // Fetch user's cart with product details (populated)
    const cart = await Cart.findOne<ICart>({
      userId: new mongoose.Types.ObjectId(user.id),
    })
      .populate({
        path: "items.productId",
        select: "_id name price productQuantity sizes", // only fetch fields we need
      })
      .lean();

    // If cart is missing or empty, bail out early
    if (!cart || cart.items.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Cart is empty",
      });
    }

    // --- Step 1: Validate products ---
    for (const item of cart.items) {
      const storeId = item.storeId.toString();
      const product = item.productId as unknown as
        | (IProduct & { _id: mongoose.Types.ObjectId })
        | null; // already populated if any

      // Product was deleted from catalog
      if (!product) {
        validationErrors.push(
          `A product in your cart no longer exists in the catalog.`
        );
        continue;
      }

      if (!groupedByStore[storeId]) {
        groupedByStore[storeId] = [];
      }

      groupedByStore[storeId].push({
        productId: product._id.toString(),
      });

      // Handle size-based products
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
        // Non-size-based products
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

    // --- Step 2: Validate stores ---
    const storeIds = Object.keys(groupedByStore);

    // Fetch all stores in a single query (optimization)
    const stores = await Store.find({
      _id: { $in: storeIds.map((id) => new mongoose.Types.ObjectId(id)) },
    })
      .select("status name")
      .lean();

    // Create quick lookup map for faster checks
    const storeMap = new Map(stores.map((s) => [s._id.toString(), s]));

    for (const storeId of storeIds) {
      const store = storeMap.get(storeId);

      if (!store) {
        // Store ID in cart does not exist anymore
        validationErrors.push(
          `One of the selected stores could not be found. Please check and try again.`
        );
        continue;
      }

      if (store.status !== StoreStatusEnum.Active) {
        // Store is in a non-active state (e.g., suspended, pending, rejected)
        validationErrors.push(
          `The store "${store.name}" is not active and cannot accept new orders.`
        );
      }
    }

    // --- Step 3: Return validation result ---
    return {
      success: true,
      isValid: validationErrors.length === 0,
      validationErrors,
    };
  }),

  // /**
  //  * Group products by their store and validate that the store is still active
  //  * and not susspended or pending approval or is rejected.
  //  */
  // validateUserCart: baseProcedure.mutation(async ({ ctx }) => {
  //   const { user } = ctx;

  //   if (!user) {
  //     throw new TRPCError({
  //       code: "UNAUTHORIZED",
  //       message: "User not authenticated",
  //     });
  //   }

  //   const Cart = await getCartModel();
  //   const Store = await getStoreModel();
  //   const Product = await getProductModel();
  //   const validationErrors: string[] = [];
  //   const groupedByStore: Record<string, { productId: string }[]> = {};

  //   const cart = await Cart.findOne<ICart>({
  //     userId: new mongoose.Types.ObjectId(user.id),
  //   })
  //     .populate({
  //       path: "items.productId",
  //       select: "_id name price productQuantity sizes",
  //     })
  //     .lean();

  //   if (!cart || cart.items.length === 0) {
  //     throw new TRPCError({
  //       code: "BAD_REQUEST",
  //       message: "Cart is empty",
  //     });
  //   }

  //   for (const item of cart.items) {
  //     const storeId = item.storeId.toString();
  //     const product = await Product.findById(item.productId._id).lean();

  //     if (!groupedByStore[storeId]) {
  //       groupedByStore[storeId] = [];
  //     }

  //     groupedByStore[storeId].push({
  //       productId: item.productId.toString(),
  //     });

  //     if (!product) {
  //       validationErrors.push(`Product no longer exists in catalog.`);
  //       continue;
  //     }

  //     // console.log("product", product);

  //     // Handle size-based products
  //     if (item.selectedSize !== undefined) {
  //       const size = product.sizes?.find(
  //         (s: { size: string }) => s.size === item.selectedSize!.size
  //       );

  //       if (!size) {
  //         validationErrors.push(
  //           `Size ${item.selectedSize.size} no longer available for ${product.name}`
  //         );
  //         continue;
  //       }

  //       if (size.quantity < item.quantity) {
  //         validationErrors.push(
  //           `Insufficient stock for ${product.name} (Size: ${item.selectedSize.size}). Available: ${size.quantity}, Requested: ${item.quantity}`
  //         );
  //       }
  //     } else {
  //       // Non-size-based products
  //       if (product.productQuantity < item.quantity) {
  //         validationErrors.push(
  //           `Insufficient stock for ${product.name}. Available: ${product.productQuantity}, Requested: ${item.quantity}`
  //         );
  //       }
  //     }
  //   }

  //   const storeIds = Object.keys(groupedByStore);

  //   for (const storeId of storeIds) {
  //     // Find the store by ID and select only status + name (optimization)
  //     const store = await Store.findById(
  //       new mongoose.Types.ObjectId(storeId)
  //     ).select("status name");

  //     if (!store) {
  //       // Store ID provided does not exist in the database
  //       validationErrors.push(
  //         `One of the selected stores could not be found. Please check and try again.`
  //       );
  //       continue; // No need to check further if store is missing
  //     }

  //     if (store.status !== StoreStatusEnum.Active) {
  //       // Store is in a non-active state (e.g., closed, inactive, etc.)
  //       validationErrors.push(
  //         `The store "${store.name}" is not active and cannot accept new orders.`
  //       );
  //     }
  //   }

  //   // if (validationErrors.length > 0) {
  //   //   throw new TRPCError({
  //   //     code: "BAD_REQUEST",
  //   //     message: "Some cart items are invalid",
  //   //     cause: validationErrors,
  //   //   });
  //   // }

  //   return {
  //     success: true,
  //     isValid: validationErrors.length > 0 ? false : true,
  //     validationErrors: validationErrors,
  //   };
  // }),
});
