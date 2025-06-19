import { z } from "zod";

import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { getStoreByUniqueId } from "@/lib/db/models/store.model";
import { TRPCError } from "@trpc/server";

export const storeRouter = createTRPCRouter({
  getById: baseProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async (input) => {
      const { id } = input.input;
      console.log("Fetching store with id:", id);

      const store = await getStoreByUniqueId(id);
      if (!store) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Store with id ${id} not found.`,
          cause: "StoreNotFound",
        });
      }
      return store;
    }),
});
