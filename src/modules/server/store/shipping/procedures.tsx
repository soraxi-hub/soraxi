import { z } from "zod";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getStoreModel } from "@/lib/db/models/store.model";
import { TRPCError } from "@trpc/server";
import mongoose from "mongoose";
import { MAX_METHODS } from "@/modules/store/shipping/shipping-methods";

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
        message: "Store not found.",
      });
    }
    // console.log("Store Shipping Methods:", store.shippingMethods);

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
              applicableRegions: [],
              conditions: {},
            };
          }
          return {
            id: method._id.toString(),
            name: method.name,
            price: method.price,
            estimatedDeliveryDays: method.estimatedDeliveryDays,
            isActive: method.isActive,
            description: method.description,
            applicableRegions: method.applicableRegions,
            conditions: method.conditions,
          };
        })
      : [];

    // console.log("Formatted Shipping Methods:", formattedShippingMethods);

    return formattedShippingMethods;
  }),

  handleStoreShippingMethodUpdate: baseProcedure
    .input(
      z.object({
        id: z.string().optional(),
        name: z.string().min(1, "Shipping method name is required"),
        price: z.number().min(0, "Shipping price must be a positive number"),
        estimatedDeliveryDays: z.number(),
        isActive: z.boolean().optional(),
        description: z
          .string()
          .min(25, "Description must be at least 25 characters"),
        applicableRegions: z.array(z.string()).optional(),
        conditions: z
          .object({
            minOrderValue: z.number().optional(),
            maxOrderValue: z.number().optional(),
            minWeight: z.number().optional(),
            maxWeight: z.number().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { store: StoreTokenData } = ctx;

      if (!StoreTokenData) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "You must be logged in to update shipping methods.",
        });
      }

      const Store = await getStoreModel();
      const store = await Store.findById(StoreTokenData.id);

      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Store not found.",
        });
      }

      // console.log("Input for Shipping Method Update:", input);

      if (store.shippingMethods.length >= MAX_METHODS) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Maximum of ${MAX_METHODS} shipping methods allowed.`,
        });
      }

      if (input.id) {
        // Update existing shipping method
        const methodIndex = store.shippingMethods.findIndex(
          (method) => method._id!.toString() === input.id
        );

        if (methodIndex === -1) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Shipping method not found.",
          });
        }

        store.shippingMethods[methodIndex] = {
          ...store.shippingMethods[methodIndex],
          ...input,
          price: input.price,
          _id: new mongoose.Types.ObjectId(input.id),
        };
      } else {
        // Add new shipping method
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
