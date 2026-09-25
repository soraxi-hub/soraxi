import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getStoreModel } from "@/lib/db/models/store.model";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { shippingMethodSchema } from "@/validators/store-validators";
import { MAX_SHIPPING_METHODS_PER_STORE } from "@/constants/shipping.constants";

export const storeShippingRouter = createTRPCRouter({
  // Fetch Store Profile Data. This is used for private store profiles.
  getStoreShippingMethods: baseProcedure.query(async ({ ctx }) => {
    const { store: StoreTokenData } = ctx;

    if (!StoreTokenData) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to view this store.",
      });
    }

    const Store = await getStoreModel();
    const store = await Store.findById(StoreTokenData.id)
      .select("shippingMethods")
      .lean();

    if (!store) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "We couldn't find your store. Sign out and sign in again.",
      });
    }

    const formattedShippingMethods = Array.isArray(store.shippingMethods)
      ? store.shippingMethods.map((method) => {
          if (!method || !method._id) {
            return {
              id: "",
              name: "",
              price: 0,
              estimatedDeliveryDays: 0,
              isActive: false,
              description: "",
            };
          }
          return {
            id: method._id.toString(),
            name: method.name,
            price: method.price,
            estimatedDeliveryDays: method.estimatedDeliveryDays,
            isActive: method.isActive,
            description: method.description,
          };
        })
      : [];

    return formattedShippingMethods;
  }),

  handleStoreShippingMethodUpdate: baseProcedure
    .input(shippingMethodSchema)
    .mutation(async ({ ctx, input }) => {
      const { store: StoreTokenData } = ctx;

      if (!StoreTokenData) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to update shipping methods.",
        });
      }

      const Store = await getStoreModel();
      const store = await Store.findById(StoreTokenData.id).select(
        "shippingMethods",
      );

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "We couldn't find your store. Sign out and sign in again.",
        });
      }

      if (input.id) {
        // Update existing shipping method
        const methodIndex = store.shippingMethods.findIndex(
          (method) => method._id!.toString() === input.id,
        );

        if (methodIndex === -1) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message:
              "That delivery method is no longer on your store. Refresh the page and try again.",
          });
        }

        store.shippingMethods[methodIndex] = {
          ...store.shippingMethods[methodIndex],
          ...input,
          price: input.price,
          _id: new mongoose.Types.ObjectId(input.id),
        };
      } else {
        if (store.shippingMethods.length >= MAX_SHIPPING_METHODS_PER_STORE) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Maximum of ${MAX_SHIPPING_METHODS_PER_STORE} shipping methods allowed.`,
          });
        }

        store.shippingMethods.push({
          ...input,
          price: input.price,
        });
      }

      await store.save();
      return {
        success: true,
        message: "Shipping method updated successfully.",
      };
    }),
});
