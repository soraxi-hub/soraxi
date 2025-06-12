import { z } from "zod";

import { getUserByEmail, getUserById } from "@/lib/db/models/user.model";
import { baseProcedure, createTRPCRouter } from "@/trpc/init";

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
