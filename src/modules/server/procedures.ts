import { z } from "zod";

import { getUserByEmail, getUserById } from "@/lib/db/models/user.model";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";
import { TRPCError } from "@trpc/server";

export const userRouter = createTRPCRouter({
  getById: baseProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async (input) => {
      const { id } = input.input;

      const user = await getUserById(id);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `User with id ${id} not found.`,
          cause: "UserNotFound",
        });
      }
      return user;
    }),

  getByEmail: baseProcedure
    .input(
      z.object({
        email: z.string().email(),
      })
    )
    .query(async (input) => {
      const { email } = input.input;

      const user = await getUserByEmail(email);
      return user;
    }),
});
